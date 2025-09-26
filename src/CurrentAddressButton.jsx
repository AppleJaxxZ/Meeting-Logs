
import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { checkLocationUsage, incrementLocationUsage } from './firebase';

const CurrentAddressButton = ({ onAddressFetched, onClearAddress }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [usageRemaining, setUsageRemaining] = useState(3);
  const [canUseLocation, setCanUseLocation] = useState(true);
  const [user, setUser] = useState(null);

  // Subscribe to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        checkUsageLimit(firebaseUser.uid);
      } else {
        setCanUseLocation(false);
        setStatusMessage('Please sign in to use location services');
      }
    });
    return () => unsubscribe();
  }, []);

  const checkUsageLimit = async (userId) => {
    try {
      const usage = await checkLocationUsage(userId);
      setUsageRemaining(usage.remaining || 0);
      setCanUseLocation(usage.allowed);

      if (!usage.allowed && usage.error) {
        setStatusMessage(usage.error);
      }
    } catch (error) {
      console.error('Error checking usage limit:', error);
      // Allow usage if check fails
      setCanUseLocation(true);
      setUsageRemaining(3);
    }
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          let errorMessage;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out";
              break;
            default:
              errorMessage = "An unknown error occurred";
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const reverseGeocode = async (lat, lng) => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Google Maps API request failed');

    const data = await response.json();
    if (data.status !== 'OK' || !data.results.length) {
      throw new Error('No address found for coordinates');
    }

    const rooftopResult = data.results.find(
      r => r.geometry.location_type === 'ROOFTOP'
    );

    const preferredTypes = ['street_address', 'premise', 'subpremise'];
    const typeFilteredResult = data.results.find(r =>
      r.types.some(type => preferredTypes.includes(type))
    );

    const bestResult = rooftopResult || typeFilteredResult || data.results[0];
    return bestResult.formatted_address;
  };

  const getCurrentAddress = async () => {
    if (!user) {
      setStatusMessage('Please sign in to use location services');
      return;
    }

    // Check usage before proceeding
    const usage = await checkLocationUsage(user.uid);
    if (!usage.allowed) {
      setStatusMessage(usage.error || 'Daily limit reached (3 uses per day)');
      setCanUseLocation(false);
      return;
    }

    setIsLoading(true);
    setStatusMessage(`📡 Fetching location... (${usage.remaining}/3 uses remaining today)`);
    setMapUrl('');

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          throw new Error('Location access is blocked. Please enable location access in your browser settings.');
        }
      }

      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      setStatusMessage('📍 Converting coordinates to address...');
      const addressResult = await reverseGeocode(latitude, longitude);
      const formatted = `📍 ${addressResult}`;

      if (onAddressFetched) {
        onAddressFetched(formatted);
      }

      // Increment usage in Firestore
      await incrementLocationUsage(user.uid);

      // 🔑 Refresh usage from Firestore so everything matches
      const updatedUsage = await checkLocationUsage(user.uid);
      setUsageRemaining(updatedUsage.remaining || 0);
      setCanUseLocation(updatedUsage.allowed);

      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=17&size=600x300&markers=color:red%7C${latitude},${longitude}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
      setMapUrl(staticMapUrl);

      setStatusMessage(`✅ Address loaded (${updatedUsage.remaining}/3 uses remaining today)`);
    } catch (error) {
      console.error('Error getting address:', error);
      const errorMsg = `❌ ${error.message}`;
      setStatusMessage(errorMsg);
      if (onAddressFetched) {
        onAddressFetched(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetAddress = () => {
    setStatusMessage('');
    setMapUrl('');
    if (onClearAddress) {
      onClearAddress();
    }
  };

  return (
    <div className="address-buttons">
      <button
        onClick={getCurrentAddress}
        disabled={isLoading || !canUseLocation}
        className="get-address-button"
        title={!canUseLocation ? 'Daily limit reached' : `${usageRemaining} uses remaining today`}
      >
        {isLoading ? 'Getting Address...' : 
         !canUseLocation ? 'Limit Reached' : 
         `Get Address (${usageRemaining}/3)`}
      </button>

      <button
        onClick={resetAddress}
        disabled={isLoading}
        className="clear-address-button"
      >
        Clear
      </button>

      {mapUrl && (
        <div className="map-popup-wrapper">
          <img
            src={mapUrl}
            alt="Map of current location"
            className="location-map-image"
            crossOrigin="anonymous"
          />
          <div className="map-popup-zoom">
            <img
              src={mapUrl}
              alt="Zoomed map"
              className="location-map-zoomed"
            />
          </div>
        </div>
      )}

      {statusMessage && <div className="address-status">{statusMessage}</div>}
      
      {!canUseLocation && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          fontSize: '0.85rem',
          color: '#c00'
        }}>
          Daily limit reached. Location detection resets at midnight.
        </div>
      )}
    </div>
  );
};

export default CurrentAddressButton;

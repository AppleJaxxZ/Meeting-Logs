import React, { useState } from 'react';

const CurrentAddressButton = ({ onAddressFetched, onClearAddress }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [mapUrl, setMapUrl] = useState('');

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
    setIsLoading(true);
    setStatusMessage('📡 Fetching your current location...');
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

      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=17&size=600x300&markers=color:red%7C${latitude},${longitude}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
      setMapUrl(staticMapUrl);

      setStatusMessage('✅ Address loaded');
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
        disabled={isLoading}
        className="get-address-button"
      >
        {isLoading ? 'Getting Address...' : 'Get Address'}
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
            crossOrigin='anonymous'
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
    </div>
  );
};

export default CurrentAddressButton;

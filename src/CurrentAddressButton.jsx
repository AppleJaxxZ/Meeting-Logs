import React, { useState } from 'react';

const CurrentAddressButton = ({onAddressFetched, onClearAddress}) => {
  const initialMessage = 'Click the button to get your current address';
  const [address, setAddress] = useState(initialMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Google Maps API request failed');
    }

    const data = await response.json();
    if (data.status !== 'OK' || !data.results.length) {
      throw new Error('No address found for coordinates');
    }

    // Filter by location_type: 'ROOFTOP'
    const rooftopResult = data.results.find(
      r => r.geometry.location_type === 'ROOFTOP'
    );

    // Filter by result_type: street-level precision
    const preferredTypes = ['street_address', 'premise', 'subpremise'];
    const typeFilteredResult = data.results.find(r =>
      r.types.some(type => preferredTypes.includes(type))
    );

    // Choose the most accurate result available
    const bestResult =
      rooftopResult || typeFilteredResult || data.results[0];

    return bestResult.formatted_address;
  } catch (error) {
    throw new Error('Failed to get address from Google Maps');
  }
  };


  const resetAddress = () => {
    setAddress(initialMessage);
    setError(null);
    setIsLoading(false);

    if (onClearAddress) {
      onClearAddress();
    }
  
  };
  const getCurrentAddress = async () => {
    setIsLoading(true);
    setError(null);
    setAddress('Checking location permissions...');

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // Check current permission status
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({name: 'geolocation'});
        console.log('Permission status:', permission.state);
        
        if (permission.state === 'denied') {
          throw new Error('Location access is blocked. Please enable location access in your browser settings and refresh the page.');
        }
      }

      setAddress('Requesting location access...');

      // Get current position
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      setAddress('Converting coordinates to address...');

      // Convert coordinates to address using reverse geocoding
      const addressResult = await reverseGeocode(latitude, longitude);
      const formatted = `📍 ${addressResult}`;
      setAddress(formatted);
      setError(null);

      if (onAddressFetched) {
        onAddressFetched(formatted);
      }
    

    } catch (error) {
      console.error('Error getting address:', error);
      setError(error.message);
      setAddress('Click the button to get your current address');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-purple-700 flex items-center justify-center p-5">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl p-10 text-white text-center max-w-2xl w-full shadow-2xl border border-white border-opacity-20">
        
        
        <button
          onClick={getCurrentAddress}
          disabled={isLoading}
          className={`
            bg-gradient-to-r from-pink-500 to-yellow-500 text-white 
            border-none py-4 px-8 text-lg rounded-full cursor-pointer 
            transition-all duration-300 shadow-lg mb-8
            ${isLoading 
              ? 'opacity-60 cursor-not-allowed transform-none' 
              : 'hover:transform hover:-translate-y-1 hover:shadow-xl'
            }
          `}
        >
          {isLoading ? 'Getting Address...' : 'Get My Current Address'}
        </button>

        <button onClick ={resetAddress} disabled= {isLoading} >Clear Address</button>;
        
        <div className="bg-white bg-opacity-20 rounded-2xl p-6 min-h-[80px] flex items-center justify-center text-base leading-relaxed">
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              {address}
            </div>
          ) : error ? (
            <div className="text-red-300 font-semibold">
              ❌ {error}
            </div>
          ) : (
            <div className={address.includes('📍') ? 'text-green-300 font-medium' : ''}>
              {address}
              {!address.includes('📍') && (
                <div className="text-sm opacity-80 mt-4">
                  📝 Note: Your browser will ask for location permission. 
                  If you don't see a prompt, check your browser's address bar for a location icon.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentAddressButton;
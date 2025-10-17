/**
 * Geolocation Hook
 *
 * Provides GPS location tracking and job site proximity validation.
 * Includes permissions handling and distance calculations.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Geolocation coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  timestamp: number;
}

/**
 * Geolocation state
 */
export interface GeolocationState {
  coordinates: Coordinates | null;
  error: string | null;
  loading: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | null;
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if coordinates are within specified radius of a location
 */
export function isWithinRadius(
  currentLat: number,
  currentLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
  return distance <= radiusMeters;
}

/**
 * Parse address to approximate coordinates (placeholder - in production use geocoding API)
 */
export function addressToCoordinates(address: string): { lat: number; lon: number } | null {
  // This is a placeholder. In production, you would use:
  // - Google Geocoding API
  // - OpenStreetMap Nominatim
  // - Mapbox Geocoding API

  // For development, return mock coordinates based on address hash
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const lat = 37.7749 + (hash % 100) / 1000; // San Francisco area
  const lon = -122.4194 + (hash % 100) / 1000;

  return { lat, lon };
}

/**
 * Hook to get current geolocation
 */
export function useGeolocation(watch = false) {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    loading: false,
    permissionStatus: null,
  });

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          },
          error: null,
          loading: false,
          permissionStatus: 'granted',
        });
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied. Please enable location access.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out.';
        }

        setState({
          coordinates: null,
          error: errorMessage,
          loading: false,
          permissionStatus: error.code === error.PERMISSION_DENIED ? 'denied' : 'granted',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    if (!watch) return;

    let watchId: number;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setState({
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            },
            error: null,
            loading: false,
            permissionStatus: 'granted',
          });
        },
        (error) => {
          setState((prev) => ({
            ...prev,
            error: error.message,
            loading: false,
            permissionStatus: error.code === error.PERMISSION_DENIED ? 'denied' : prev.permissionStatus,
          }));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watch]);

  return {
    ...state,
    getCurrentPosition,
    refresh: getCurrentPosition,
  };
}

/**
 * Hook to validate job site proximity
 */
export function useJobSiteProximity(
  jobSiteAddress: string,
  requiredRadiusMeters: number = 100
) {
  const { coordinates, error, loading, getCurrentPosition } = useGeolocation(false);
  const [proximityCheck, setProximityCheck] = useState<{
    isNearby: boolean | null;
    distance: number | null;
    checking: boolean;
  }>({
    isNearby: null,
    distance: null,
    checking: false,
  });

  const checkProximity = useCallback(async () => {
    setProximityCheck((prev) => ({ ...prev, checking: true }));

    // Get current location
    getCurrentPosition();

    // Wait for coordinates
    if (!coordinates) {
      setProximityCheck({
        isNearby: null,
        distance: null,
        checking: false,
      });
      return;
    }

    // Get job site coordinates (in production, use geocoding API)
    const jobSiteCoords = addressToCoordinates(jobSiteAddress);

    if (!jobSiteCoords) {
      setProximityCheck({
        isNearby: false,
        distance: null,
        checking: false,
      });
      return;
    }

    // Calculate distance
    const distance = calculateDistance(
      coordinates.latitude,
      coordinates.longitude,
      jobSiteCoords.lat,
      jobSiteCoords.lon
    );

    const isNearby = distance <= requiredRadiusMeters;

    setProximityCheck({
      isNearby,
      distance,
      checking: false,
    });
  }, [coordinates, jobSiteAddress, requiredRadiusMeters, getCurrentPosition]);

  return {
    ...proximityCheck,
    checkProximity,
    coordinates,
    locationError: error,
    locationLoading: loading,
    requiredRadius: requiredRadiusMeters,
  };
}

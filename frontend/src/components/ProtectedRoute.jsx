import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ allowedRoles }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingSpinner text="Checking authentication..." />;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'student' ? '/dashboard' : `/${profile.role}`} replace />;
  }

  return <Outlet />;
}
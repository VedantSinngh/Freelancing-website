import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useBids = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchMyBids = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/bids/my`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch your bids');
      }

      return await response.json();
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectBids = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/bids`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project bids');
      }

      return await response.json();
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const submitBid = async (projectId: string, bidData: { amount: number; timeline: string; proposal: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/bids`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...bidData, project_id: projectId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to submit bid');
      }
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBidStatus = async (bidId: string, status: 'accepted' | 'rejected' | 'withdrawn') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/bids/${bidId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update bid status');
      }
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchMyBids,
    fetchProjectBids,
    submitBid,
    updateBidStatus
  };
};

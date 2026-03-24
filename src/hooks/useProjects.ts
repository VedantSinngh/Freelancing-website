import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useProjects = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchProjects = useCallback(async (clientId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API_URL}/projects`);
      if (clientId) {
        url.searchParams.append('client_id', clientId);
      }
      
      const response = await fetch(url.toString(), {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      return await response.json();
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = async (projectData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(projectData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to post project');
      }
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id: string, projectData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(projectData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update project');
      }
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete project');
      }
      return true;
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
    fetchProjects,
    createProject,
    updateProject,
    deleteProject
  };
};

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Category } from '@/types/category';

export const useCategoryStore = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCategories = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const response = await api.getCategories(token);
      const list = Array.isArray(response) ? response : [];
      setCategories(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCategory = useCallback(
    async (token: string, data: { name: string; color?: string; key?: string }) => {
      const created = await api.createCategory(data, token);
      setCategories(prev => [...prev, created]);
      return created as Category;
    },
    []
  );

  const updateCategory = useCallback(
    async (token: string, id: string, data: { name?: string; color?: string | null }) => {
      const updated = await api.updateCategory(id, data, token);
      setCategories(prev => prev.map(c => (c.id === id ? (updated as Category) : c)));
      return updated as Category;
    },
    []
  );

  const deleteCategory = useCallback(async (token: string, id: string) => {
    await api.deleteCategory(id, token);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  return {
    categories,
    isLoading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};


import { useState, useCallback } from 'react';
import { Product } from '@/types/product';
import { api } from '@/lib/api';

export const useProductStore = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const mapProduct = (p: any): Product => ({
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    requirements: p.requirements ?? null,
    includes: p.includes,
    categories: Array.isArray(p.categories) ? p.categories : [],
    price: Number(p.price),
    imagePath: p.image_path || p.imagePath || null,
    createdAt: new Date(p.created_at || p.createdAt || Date.now()),
    updatedAt: new Date(p.updated_at || p.updatedAt || Date.now()),
  });

  const fetchProducts = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const response = await api.getProducts(token);
      const list = Array.isArray(response) ? response : [];
      setProducts(list.map(mapProduct));
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProduct = useCallback(
    async (
      token: string,
      data: {
        title: string;
        includes: string;
        price: number;
        description?: string;
        requirements?: string;
          categories?: string[];
        imageFile?: File | null;
      }
    ) => {
      const created = await api.createProduct(data, token);
      const product = mapProduct(created);
      setProducts((prev) => [product, ...prev]);
      return product;
    },
    []
  );

  const updateProduct = useCallback(
    async (
      token: string,
      id: string,
      data: {
        title?: string;
        includes?: string;
        price?: number;
        description?: string;
        requirements?: string;
          categories?: string[];
        imageFile?: File | null;
      }
    ) => {
      const updated = await api.updateProduct(id, data, token);
      const product = mapProduct(updated);
      setProducts((prev) => prev.map((p) => (p.id === id ? product : p)));
      return product;
    },
    []
  );

  const deleteProduct = useCallback(async (token: string, id: string) => {
    await api.deleteProduct(id, token);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const replaceProducts = useCallback((next: Product[]) => {
    setProducts(next);
  }, []);

  return {
    products,
    isLoading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    replaceProducts,
  };
};


export interface Product {
  id: string;
  title: string;
  description?: string | null;
  requirements?: string | null;
  includes: string;
  categories?: string[];
  price: number;
  imagePath?: string | null;
  createdAt: Date;
  updatedAt: Date;
}


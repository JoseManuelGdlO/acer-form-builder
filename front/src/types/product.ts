export interface Product {
  id: string;
  title: string;
  description: string;
  requirements: string;
  imagePath?: string | null;
  createdAt: Date;
  updatedAt: Date;
}


import { Id } from "../convex/_generated/dataModel";

export interface CartItem {
  _id: Id<"items">;
  name: string;
  price?: number;
  imageId?: string;
  shopId?: Id<"shops">;
  shopName?: string;
  quantity: number;
  inStock: boolean;
  createdAt: number;
  updatedAt: number;
  category?: string;
  description?: string;
  priceDescription?: string;
  offer?: string;
}

export interface Shop {
  _id: Id<"shops">;
  name: string;
  category: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  isOpen: boolean;
  lastUpdated: number;
  mobileNumber?: string;
  shopImageId?: string;
  shopImageIds?: string[];
  estimatedTime?: {
    hours: number;
    minutes: number;
    action: "opening" | "closing";
  };
  distance?: number | null;
  hasDelivery?: boolean;
  deliveryRange?: number;
  // Verification fields
  isVerified?: boolean;
  verifiedAt?: number;
}

export interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  phone?: string;
  photoUri?: string;
  role: "shopkeeper" | "customer";
}

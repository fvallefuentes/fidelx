import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      plan: string;
      role: string;
      merchantId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    plan: string;
    role: string;
    merchantId: string;
    createdAt?: string;
  }
}

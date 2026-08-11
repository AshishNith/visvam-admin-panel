export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const ADMIN_TOKEN_KEY = "visvam_admin_auth_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export interface Product {
  _id?: string;
  slug: string;
  name: string;
  tagline: string;
  price: number;
  category: "gourmet" | "nuts" | "gifting";
  badge?: string;
  images: string[];
  description: string;
  serving: string;
  origin: string;
  grade?: string;
  benefits?: string[];
  bestseller?: boolean;
  isNew?: boolean;
  isNewProduct?: boolean;
  stock?: number;
}

export interface OrderItem {
  product: string;
  slug: string;
  name: string;
  qty: number;
  price: number;
  image: string;
}

export interface Order {
  _id: string;
  guestEmail?: string;
  user?: { name?: string; email?: string };
  orderItems: OrderItem[];
  pickupLane?: string;
  pickupSlot?: string;
  paymentMethod: string;
  itemsPrice: number;
  taxPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: string;
  status: "Pending" | "Processing" | "Shipped" | "Completed" | "Cancelled";
  createdAt: string;
}

export interface ContactInquiry {
  _id: string;
  name: string;
  email: string;
  message: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: string;
}

export interface NewsletterSubscriber {
  _id: string;
  email: string;
  status: string;
  subscribedAt: string;
}

export interface ClientMemoryNote {
  id: string;
  clientName: string;
  email?: string;
  category: string;
  notes: string;
  needsUpdate: boolean;
  lastUpdated: string;
}

// Admin Authentication API
export async function adminLogin(email: string, password: string): Promise<{ success: boolean; token?: string; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (json.success && json.token) {
      setAdminToken(json.token);
    }
    return json;
  } catch (err: any) {
    return { success: false, message: err.message || "Login failed" };
  }
}

// Cloudinary Image Upload API
export async function uploadImageToCloudinary(file: File): Promise<{ success: boolean; url?: string; message?: string }> {
  try {
    const token = getAdminToken();
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Image upload failed" };
  }
}

export async function uploadMultipleImagesToCloudinary(files: File[]): Promise<{ success: boolean; urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const res = await uploadImageToCloudinary(file);
    if (res.success && res.url) {
      urls.push(res.url);
    } else {
      errors.push(res.message || `Failed to upload ${file.name}`);
    }
  }

  return {
    success: urls.length > 0,
    urls,
    errors,
  };
}

export async function getCurrentAdminProfile(): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/profile`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Unauthorized");
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Products API
export async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/products?limit=100`);
    if (!res.ok) throw new Error("Failed to fetch products");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("Products fetch error:", err);
    return [];
  }
}

export async function createProduct(data: Partial<Product>): Promise<{ success: boolean; data?: Product; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<{ success: boolean; data?: Product; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteProduct(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Orders API
export async function getOrders(): Promise<Order[]> {
  try {
    const res = await fetch(`${API_BASE}/orders`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch orders");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("Orders fetch error:", err);
    return [];
  }
}

export async function updateOrderStatus(id: string, status: string, isPaid?: boolean): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, isPaid }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Inquiries API
export async function getInquiries(): Promise<ContactInquiry[]> {
  try {
    const res = await fetch(`${API_BASE}/contact`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch inquiries");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("Inquiries fetch error:", err);
    return [];
  }
}

export async function updateInquiryStatus(id: string, status: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/contact/${id}/status`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteInquiry(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/contact/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Newsletter API
export async function getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  try {
    const res = await fetch(`${API_BASE}/newsletter`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch newsletter");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("Newsletter fetch error:", err);
    return [];
  }
}

export async function deleteSubscriber(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/newsletter/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}


// Client Memory Tracker API
const MEMORY_STORAGE_KEY = "visvam_admin_client_memory_v1";

const INITIAL_MEMORIES: ClientMemoryNote[] = [
  {
    id: "mem-1",
    clientName: "Madhavendra Mishra",
    email: "madhav@visvamharvest.com",
    category: "Co-Founder",
    notes: "Recently onboarded co-founder leading global sourcing and supply chain strategy.",
    needsUpdate: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "mem-2",
    clientName: "Ananya Sharma (Executive Corporate Client)",
    email: "ananya@heritagesuite.com",
    category: "Corporate Hampers",
    notes: "Requested 50 custom-branded Royal Heritage hampers for Diwali. Prefers Mamra almonds & Medjool dates.",
    needsUpdate: true,
    lastUpdated: new Date().toISOString(),
  },
];

export function getClientMemories(): ClientMemoryNote[] {
  try {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(INITIAL_MEMORIES));
      return INITIAL_MEMORIES;
    }
    return JSON.parse(stored);
  } catch {
    return INITIAL_MEMORIES;
  }
}

export function saveClientMemory(note: Omit<ClientMemoryNote, "id" | "lastUpdated">): ClientMemoryNote[] {
  const current = getClientMemories();
  const newNote: ClientMemoryNote = {
    ...note,
    id: `mem-${Date.now()}`,
    lastUpdated: new Date().toISOString(),
  };
  const updated = [newNote, ...current];
  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteClientMemory(id: string): ClientMemoryNote[] {
  const current = getClientMemories();
  const updated = current.filter((m) => m.id !== id);
  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function toggleMemoryUpdateFlag(id: string): ClientMemoryNote[] {
  const current = getClientMemories();
  const updated = current.map((m) => (m.id === id ? { ...m, needsUpdate: !m.needsUpdate } : m));
  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

// Employee Management API
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: "Management" | "Operations" | "Logistics" | "Support" | "Sales";
  status: "Active" | "On Leave" | "Inactive";
  joinedDate: string;
}

const EMPLOYEE_STORAGE_KEY = "visvam_admin_employees_v1";

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    name: "Madhavendra Mishra",
    email: "madhav@visvamharvest.com",
    phone: "+91 98765 43210",
    role: "Co-Founder & Head of Sourcing",
    department: "Management",
    status: "Active",
    joinedDate: "2026-01-15",
  },
  {
    id: "emp-2",
    name: "Ranjan Ashish",
    email: "admin@visvam.com",
    phone: "+91 99920 12345",
    role: "System Administrator",
    department: "Operations",
    status: "Active",
    joinedDate: "2026-01-01",
  },
  {
    id: "emp-3",
    name: "Ananya Sharma",
    email: "ananya.s@visvamharvest.com",
    phone: "+91 98123 56789",
    role: "Customer Support Specialist",
    department: "Support",
    status: "Active",
    joinedDate: "2026-02-01",
  },
  {
    id: "emp-4",
    name: "Vikramaditya Rao",
    email: "vikram@visvamharvest.com",
    phone: "+91 97654 32109",
    role: "Cold-Chain Logistics Lead",
    department: "Logistics",
    status: "Active",
    joinedDate: "2026-02-10",
  },
];

export function getEmployees(): Employee[] {
  try {
    const stored = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    return JSON.parse(stored);
  } catch {
    return INITIAL_EMPLOYEES;
  }
}

export function saveEmployee(emp: Omit<Employee, "id" | "joinedDate">): Employee[] {
  const current = getEmployees();
  const newEmployee: Employee = {
    ...emp,
    id: `emp-${Date.now()}`,
    joinedDate: new Date().toISOString().split("T")[0],
  };
  const updated = [newEmployee, ...current];
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function updateEmployee(id: string, empData: Partial<Employee>): Employee[] {
  const current = getEmployees();
  const updated = current.map((e) => (e.id === id ? { ...e, ...empData } : e));
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteEmployee(id: string): Employee[] {
  const current = getEmployees();
  const updated = current.filter((e) => e.id !== id);
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

// Registered Users API
export interface RegisteredUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  phone?: string;
  avatar?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export async function getUsers(): Promise<RegisteredUser[]> {
  try {
    const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch users");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("Users fetch error:", err);
    return [];
  }
}

export async function updateUserRole(id: string, role: "user" | "admin", name?: string, phone?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ role, name, phone }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteUser(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}



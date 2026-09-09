export const API_BASE = import.meta.env.VITE_API_URL || "https://visvam-backend.onrender.com/api/v1";

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

// Admin-uploaded images are stored as raw, full-resolution Cloudinary URLs
// (frequently 8000px+ / ~10MB). Rendering those originals as small thumbnails
// is what made these lists crawl. Request a small derivative instead.
export function thumbUrl(url?: string, width = 200): string {
  if (!url || !url.includes("res.cloudinary.com")) return url || "";
  const marker = "/image/upload/";
  const at = url.indexOf(marker);
  if (at === -1) return url;
  const prefix = url.slice(0, at + marker.length);
  const rest = url.slice(at + marker.length);
  const firstSegment = rest.split("/")[0];
  if (/(^|,)(f_|q_|w_|h_|c_|dpr_)/.test(firstSegment)) return url;
  return `${prefix}f_auto,q_auto,w_${width},c_limit/${rest}`;
}

export interface IVariantAttribute {
  name: string;
  values: string[];
}

export interface IProductVariant {
  _id?: string;
  sku?: string;
  title: string;
  options: Record<string, string>;
  price: number;
  mrp?: number;
  stock: number;
  image?: string;
  isDefault?: boolean;
  /** Gross packed weight in kg — drives the Shiprocket delivery rate. */
  weightKg?: number;
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
  benefits?: string[];
  bestseller?: boolean;
  isNew?: boolean;
  isNewProduct?: boolean;
  stock?: number;
  /** Gross packed weight in kg for products without variants. */
  weightKg?: number;
  hasVariants?: boolean;
  variantAttributes?: IVariantAttribute[];
  variants?: IProductVariant[];
  relatedProducts?: Product[] | string[];
}

export interface OrderItem {
  product: string;
  slug: string;
  name: string;
  qty: number;
  price: number;
  image: string;
  variantTitle?: string;
  variantSku?: string;
  selectedOptions?: Record<string, string>;
  /** Pack-size text ("500g Pouch") for products sold without variants. */
  serving?: string;
}

/** Pull the first weight/volume token ("250g", "1 kg", "400 ml") out of a string. */
function extractWeightToken(text?: string): string | null {
  if (!text) return null;
  const m = text.match(/\d+(?:\.\d+)?\s*(?:kg|kgs|g|gm|gms|gram|grams|ml|l|ltr|litre|liter)\b/i);
  return m ? m[0].replace(/\s+/g, "").toLowerCase() : null;
}

/**
 * The pack size (weight) for one order line — "250g", "500g", "1kg", …
 *
 * Only ever returns an actual weight: it reads the "Weight" option chosen at
 * checkout, then any weight token in the variant title or the product's serving
 * text. Returns null when the order captured no weight — an older order, or an
 * item re-ordered from history without its size — so the caller can say
 * "not recorded" instead of showing a non-size label like "Pack" or "Pouch".
 */
export function orderItemPackLabel(item: OrderItem): string | null {
  // 1. The size the customer actually picked at checkout.
  if (item.selectedOptions) {
    for (const [key, val] of Object.entries(item.selectedOptions)) {
      if (val && val.trim() && /weight|size|gram|quantity/i.test(key)) return val.trim();
    }
    for (const val of Object.values(item.selectedOptions)) {
      const w = extractWeightToken(val);
      if (w) return w;
    }
  }
  // 2. A weight in the variant title ("Reserve Super Jumbo · 500g", "250g").
  const fromTitle = extractWeightToken(item.variantTitle);
  if (fromTitle) return fromTitle;
  if (item.variantTitle && /^\s*\d/.test(item.variantTitle)) return item.variantTitle.trim();
  // 3. A weight in the serving text ("500g Box", "1kg Luxury Gift Box").
  const fromServing = extractWeightToken(item.serving);
  if (fromServing) return fromServing;
  return null;
}

export interface ShiprocketDetails {
  orderId?: number;
  shipmentId?: number;
  awbCode?: string;
  courierName?: string;
  courierId?: number;
  labelUrl?: string;
  manifestUrl?: string;
  invoiceUrl?: string;
  trackingUrl?: string;
  status?: string;
  lastTrackedAt?: string;
}

export interface Order {
  _id: string;
  guestEmail?: string;
  user?: { name?: string; email?: string };
  orderItems: OrderItem[];
  pickupLane?: string;
  pickupSlot?: string;
  /** "pickup" = customer collects from the Sector 63 warehouse (no courier, never in Shiprocket). */
  fulfillmentMethod?: "ship" | "pickup";
  shippingAddress?: {
    fullName?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    country?: string;
  };
  paymentMethod: string;
  itemsPrice: number;
  /** Coupon code applied at checkout (uppercased), if any. */
  couponCode?: string;
  /** Rupee amount taken off the items subtotal by the coupon. 0/absent if none. */
  discountAmount?: number;
  taxPrice: number;
  shippingPrice: number;
  /** Cash-on-Delivery surcharge. Zero for prepaid orders. */
  codFee?: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: string;
  status: "Pending" | "Processing" | "Shipped" | "Completed" | "Cancelled";
  shiprocket?: ShiprocketDetails;
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

// Merchandising API — named, ordered product picks that drive the storefront's
// nav dropdowns and homepage bestsellers section. Adding a new curated spot
// on the site later just means introducing a new slot key, no API change.
export async function getMerchandising(): Promise<Record<string, Product[]>> {
  try {
    const res = await fetch(`${API_BASE}/merchandising`);
    if (!res.ok) throw new Error("Failed to fetch merchandising slots");
    const json = await res.json();
    return json.data || {};
  } catch (err) {
    console.error("Merchandising fetch error:", err);
    return {};
  }
}

export async function updateMerchandisingSlot(
  key: string,
  productIds: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/merchandising/${key}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ productIds }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Store Settings API (editable store-wide knobs)
export interface StoreSettings {
  /** Surcharge on Cash-on-Delivery orders. Prepaid orders pay nothing extra. */
  codHandlingFee: number;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const defaults: StoreSettings = { codHandlingFee: 10 };
  try {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error("Failed to fetch store settings");
    const json = await res.json();
    return { ...defaults, ...(json.data || {}) };
  } catch (err) {
    console.error("Store settings fetch error:", err);
    return defaults;
  }
}

export async function updateStoreSetting(
  key: keyof StoreSettings,
  value: number
): Promise<{ success: boolean; message?: string; data?: { key: string; value: number } }> {
  try {
    const res = await fetch(`${API_BASE}/settings/${key}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ value }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Coupons API — percentage-off discount codes customers enter at checkout.
export interface Coupon {
  _id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  /** ISO date string, or null/undefined for "never expires". */
  expiresAt?: string | null;
  /** Minimum cart subtotal (rupees) required. 0 = no minimum. */
  minOrderValue: number;
  /** Auto-disables after this many redemptions. 0 = unlimited. */
  maxRedemptions: number;
  /** How many times one customer may redeem it. 0 = unlimited. */
  usesPerCustomer: number;
  /** @deprecated Superseded by `usesPerCustomer`; kept for older coupons. */
  oncePerCustomer: boolean;
  timesRedeemed: number;
  redeemedEmails?: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getCoupons(): Promise<Coupon[]> {
  try {
    const res = await fetch(`${API_BASE}/coupons`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch coupons");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("Coupons fetch error:", err);
    return [];
  }
}

export async function createCoupon(
  data: Partial<Coupon>
): Promise<{ success: boolean; data?: Coupon; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/coupons`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updateCoupon(
  id: string,
  data: Partial<Coupon>
): Promise<{ success: boolean; data?: Coupon; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/coupons/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteCoupon(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/coupons/${id}`, {
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
    email: "madhav@visvam.in",
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
    email: "madhav@visvam.in",
    phone: "+91 98765 43210",
    role: "Co-Founder & Head of Sourcing",
    department: "Management",
    status: "Active",
    joinedDate: "2026-01-15",
  },
  {
    id: "emp-2",
    name: "Ranjan Ashish",
    email: "admin@visvam.in",
    phone: "+91 99920 12345",
    role: "System Administrator",
    department: "Operations",
    status: "Active",
    joinedDate: "2026-01-01",
  },
  {
    id: "emp-3",
    name: "Ananya Sharma",
    email: "ananya.s@visvam.in",
    phone: "+91 98123 56789",
    role: "Customer Support Specialist",
    department: "Support",
    status: "Active",
    joinedDate: "2026-02-01",
  },
  {
    id: "emp-4",
    name: "Vikramaditya Rao",
    email: "vikram@visvam.in",
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

// ── Shiprocket Logistics & Courier APIs ───────────────────────────
export interface CourierOption {
  id: number;
  name: string;
  /** Total Shiprocket bills — freight PLUS COD and other charges. */
  rate: number;
  freightCharge?: number;
  codCharges?: number;
  isSurface?: boolean;
  rating?: number;
  etd: string;
  estimatedDays: number | string;
}

/** Couriers that can service a placed order's destination PIN code. */
export async function getShiprocketCouriers(orderId: string): Promise<{
  success: boolean;
  message?: string;
  courierName?: string;
  courierRate?: number;
  etd?: string;
  /** The courier the customer's delivery charge was quoted from (cheapest). */
  quotedCourierId?: number;
  /** Parcel weight the quote was based on. */
  weightKg?: number;
  /** Whether COD collection fees are bundled into these rates. */
  isCod?: boolean;
  availableCouriers?: CourierOption[];
}> {
  try {
    const res = await fetch(`${API_BASE}/shipping/orders/${orderId}/couriers`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to load couriers" };
  }
}

export async function createShiprocketShipment(
  orderId: string,
  courierId?: number
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    orderId: string;
    status: string;
    shiprocket: ShiprocketDetails;
  };
}> {
  try {
    const res = await fetch(`${API_BASE}/shipping/orders/${orderId}/ship`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(courierId ? { courierId } : {}),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to push shipment to Shiprocket" };
  }
}

export async function getShiprocketLabel(orderId: string): Promise<{ success: boolean; labelUrl?: string; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/shipping/orders/${orderId}/label`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to retrieve shipping label" };
  }
}

export async function trackOrderShipment(awbOrOrderId: string): Promise<{
  success: boolean;
  awbCode?: string;
  currentStatus?: string;
  currentLocation?: string;
  etd?: string;
  courier?: string;
  timeline?: Array<{ date: string; activity: string; location: string; completed?: boolean }>;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/shipping/track/${awbOrOrderId}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to fetch live shipment tracking" };
  }
}

export async function checkPincodeServiceability(pincode: string, weightKg: number = 0.5): Promise<{
  success: boolean;
  isServiceable?: boolean;
  estimatedDays?: number;
  etd?: string;
  courierName?: string;
  courierRate?: number;
  availableCouriers?: Array<{ id: number; name: string; rate: number; etd: string; estimatedDays: number }>;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/shipping/check-serviceability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pincode, weightKg }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to check PIN code serviceability" };
  }
}




import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import ProductEditPage from "./pages/ProductEditPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import InquiriesPage from "./pages/InquiriesPage";
import SubscribersPage from "./pages/SubscribersPage";
import EmployeesPage from "./pages/EmployeesPage";
import UsersPage from "./pages/UsersPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

import {
  getAdminToken,
  clearAdminToken,
  getProducts,
  getOrders,
  getInquiries,
  getNewsletterSubscribers,
  getEmployees,
  type Product,
  type Order,
  type ContactInquiry,
  type NewsletterSubscriber,
  type Employee,
} from "./lib/api";
import { toast } from "sonner";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAdminToken());
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, orderData, inqData, subData] = await Promise.all([
        getProducts(),
        getOrders(),
        getInquiries(),
        getNewsletterSubscribers(),
      ]);
      setProducts(prodData);
      setOrders(orderData);
      setInquiries(inqData);
      setSubscribers(subData);
      setEmployees(getEmployees());
    } catch (err) {
      toast.error("Failed to load backend data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    clearAdminToken();
    setIsAuthenticated(false);
    toast.info("Logged out successfully.");
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout
              onLogout={handleLogout}
              onRefreshData={loadData}
              loading={loading}
            />
          }
        >
          <Route
            index
            element={
              <DashboardPage
                products={products}
                orders={orders}
                inquiries={inquiries}
              />
            }
          />
          <Route
            path="products"
            element={
              <ProductsPage
                products={products}
                onRefresh={loadData}
              />
            }
          />
          <Route
            path="products/new"
            element={
              <ProductEditPage
                products={products}
                onRefresh={loadData}
              />
            }
          />
          <Route
            path="products/:id"
            element={
              <ProductEditPage
                products={products}
                onRefresh={loadData}
              />
            }
          />
          <Route
            path="orders"
            element={
              <OrdersPage
                orders={orders}
                onRefresh={loadData}
              />
            }
          />
          <Route
            path="orders/:id"
            element={
              <OrderDetailPage
                orders={orders}
                onRefresh={loadData}
              />
            }
          />
          <Route
            path="inquiries"
            element={
              <InquiriesPage
                inquiries={inquiries}
                onRefresh={loadData}
              />
            }
          />
          <Route
            path="subscribers"
            element={
              <SubscribersPage
                subscribers={subscribers}
                onRefresh={loadData}
              />
            }
          />
          <Route
            path="employees"
            element={
              <EmployeesPage
                employees={employees}
                onRefresh={loadData}
              />
            }
          />
          <Route path="users" element={<UsersPage />} />
          <Route
            path="reports"
            element={
              <ReportsPage
                products={products}
                orders={orders}
              />
            }
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

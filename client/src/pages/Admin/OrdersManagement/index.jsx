import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import AdminGate from "../../../components/AdminGate.jsx";

export default function OrdersManagementLayout() {
  return (
    <AdminGate fallback={<div className="p-6">You do not have access to orders management.</div>}>
      <div className="container-page py-4" style={{ maxWidth: "100%", width: "100%", paddingLeft: "1rem", paddingRight: "1rem" }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold margin-bottom-md">Orders Management</h1>
          <nav className="orders-filter-nav">
            <NavLink 
              to="." 
              end 
              className={({isActive})=>isActive?"active":""}
            >
              All Orders
            </NavLink>
            <NavLink 
              to="new" 
              className={({isActive})=>isActive?"active":""}
            >
              New Orders
            </NavLink>
            <NavLink 
              to="in-progress" 
              className={({isActive})=>isActive?"active":""}
            >
              In Progress
            </NavLink>
            <NavLink 
              to="ready" 
              className={({isActive})=>isActive?"active":""}
            >
              Ready
            </NavLink>
            <NavLink 
              to="delivery" 
              className={({isActive})=>isActive?"active":""}
            >
              Out for Delivery
            </NavLink>
            <NavLink 
              to="completed" 
              className={({isActive})=>isActive?"active":""}
            >
              Completed
            </NavLink>
            <NavLink 
              to="archived" 
              className={({isActive})=>isActive?"active":""}
            >
              Archived Orders
            </NavLink>
          </nav>
        </div>
        <main className="w-full" style={{ maxWidth: "100%", width: "100%" }}>
          <Outlet />
        </main>
      </div>
    </AdminGate>
  );
}


"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const { user } = useUser();

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <Link href="/" className="text-lg font-bold">
        School Management
      </Link>
      <div className="flex items-center space-x-4">
        {user?.publicMetadata.role === "ADMIN" && (
          <Link href="/admin/users" className="hover:underline">
            Admin
          </Link>
        )}
        <Bell className="w-6 h-6" />
        <UserButton afterSignOutUrl="/" />
      </div>
    </nav>
  );
}
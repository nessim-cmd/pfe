import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import UserDialog from "./UserDialog";
import UserRow from "./UserRow";
import { addUserToDatabase } from "@/services/userService";

export default async function AdminUsersPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  });
  if (!dbUser) {
    const email = clerkUser.emailAddresses[0].emailAddress;
    await addUserToDatabase(clerkUser.id, clerkUser.firstName || "Admin", email, "ADMIN");
  } else if (dbUser.role !== "ADMIN") {
    redirect("/");
  } else if (dbUser.clerkUserId?.startsWith("inv_")) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { clerkUserId: clerkUser.id },
    });
  }

  const users = await prisma.user.findMany();

  async function handleAddUser(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as "ADMIN" | "USER" | "MAGASINNAIRE";

    try {
      console.log("Creating invitation for:", { email, role });

      const invitationsResponse = await fetch(
        `https://api.clerk.com/v1/invitations?email_address=${encodeURIComponent(email)}`,
        {
          headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
        }
      );
      if (!invitationsResponse.ok) throw new Error("Failed to fetch invitations");
      const invitations = await invitationsResponse.json();
      for (const inv of invitations) {
        if (inv.status === "pending" && inv.email_address === email) {
          console.log("Revoking existing invitation:", inv.id);
          await fetch(`https://api.clerk.com/v1/invitations/${inv.id}/revoke`, {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
          });
        }
      }

      const response = await fetch("https://api.clerk.com/v1/invitations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          public_metadata: { role },
          redirect_url: "http://localhost:3000/sign-in",
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send invitation: ${errorText}`);
      }

      const invitation = await response.json();
      console.log("Invitation created:", invitation);

      await prisma.user.create({
        data: { clerkUserId: invitation.id, name, email, role },
      });
    } catch (error) {
      console.error("Error in handleAddUser:", error);
      throw error;
    }

    redirect("/admin/users");
  }

  async function handleDeleteUser(clerkUserId: string) {
    "use server";
    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return;

    if (clerkUserId.startsWith("user_")) {
      await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      });
    } else if (clerkUserId.startsWith("inv_")) {
      await fetch(`https://api.clerk.com/v1/invitations/${clerkUserId}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      });
    }

    await prisma.user.delete({ where: { clerkUserId } });
    redirect("/admin/users");
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl mb-4 font-bold">User Management</h1>
      <UserDialog onAdd={handleAddUser} />
      <table className="w-full border-collapse mt-6 rounded-lg">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Role</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow key={u.id} user={u} onDelete={handleDeleteUser} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
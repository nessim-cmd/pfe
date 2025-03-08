/* eslint-disable @typescript-eslint/no-explicit-any */
import { SignIn } from "@clerk/nextjs";


export default async function SignInPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const ticket = searchParams["__clerk_ticket"];
  let email: string | undefined;

  if (ticket) {
    try {
      const response = await fetch("https://api.clerk.com/v1/invitations", {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      });
      const invitations = await response.json();
      const invitation = invitations.find((inv: any) => ticket.includes(inv.id));
      if (invitation) {
        email = invitation.email_address;
        console.log("Invitation found for email:", email);
      }
    } catch (error) {
      console.error("Error fetching invitation:", error);
    }
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/"
        initialValues={email ? { emailAddress: email } : undefined}
      />
    </div>
  );
}
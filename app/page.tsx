import { redirect } from "next/navigation";

// Root page — students land on the browse page
export default function RootPage() {
  redirect("/browse");
}

import { redirect } from "next/navigation";

export default function CliRedirectPage() {
  redirect("/settings?tab=cli");
}


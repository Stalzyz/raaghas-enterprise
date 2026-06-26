export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation";

export default function ProductsPage() {
  // We redirect users to the primary 'all' collection to ensure they entering the filtering funnel immediately.
  redirect("/collections/all");
}

import MyPlans from "@/features/action-plans/components/my-plans";

/**
 * Outside any area on purpose: a process owner from another area has no access
 * to Calidad's, but the API still shows them the actions they are named in.
 */
export default function MyActionPlansPage() {
  return <MyPlans />;
}

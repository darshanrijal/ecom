import { PageHeader } from "@/features/admin/components/page-header";
import { SettingsForm } from "@/features/admin/components/settings-form";

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage store details, payment gateways and notifications."
      />

      <SettingsForm />
    </>
  );
}

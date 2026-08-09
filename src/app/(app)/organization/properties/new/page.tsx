import { Breadcrumb } from "@/components/ui";
import { getOrgContext } from "@/lib/org-context";
import { PropertyWizard } from "./property-wizard";

export default async function NewPropertyWizardPage() {
  const org = await getOrgContext();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, "Properties", "New Property Wizard"]} />
      <h1 className="text-xl text-gray-900">New Property Wizard</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Set up a new property end to end — buildings, floors, room types, rooms, and restaurants — in one guided flow.
      </p>
      <PropertyWizard />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { createBanquetPackageTemplate, createMenuCategoryTemplate, createRoomTypeTemplate } from "@/app/actions/templates";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, Breadcrumb, Input, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function CorporateTemplatesPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: roomTypeTemplates }, { data: menuCategoryTemplates }, { data: banquetPackageTemplates }] = await Promise.all([
    supabase.from("corporate_room_type_templates").select("id, name, base_rate, max_occupancy").order("name"),
    supabase.from("corporate_menu_category_templates").select("id, name, sort_order").order("sort_order"),
    supabase.from("corporate_banquet_package_templates").select("id, name, price_per_cover").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, "Corporate Templates"]} />
      <h1 className="text-xl text-gray-900">Corporate Master-Data Templates</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Define a template here once; any property can then adopt it as a starting point for its own room type,
        menu category, or banquet package — adopting copies the values in, it doesn&apos;t link them, so each
        property is free to edit its copy afterwards.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Room type templates" />
          {!roomTypeTemplates?.length ? (
            <EmptyState>No room type templates yet.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {roomTypeTemplates.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-2 text-sm">
                  <span className="text-gray-700">{t.name}</span>
                  <span className="text-gray-500">
                    {formatMoney(t.base_rate, org.currency)} · {t.max_occupancy} pax
                  </span>
                </div>
              ))}
            </div>
          )}
          <form action={createRoomTypeTemplate} className="space-y-2 border-t border-gray-100 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Deluxe" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Base rate</Label>
                <Input name="base_rate" type="number" min={0} step="0.01" required />
              </div>
              <div>
                <Label>Max occupancy</Label>
                <Input name="max_occupancy" type="number" min={1} defaultValue={2} />
              </div>
            </div>
            <div>
              <Label>Amenities</Label>
              <Input name="amenities" placeholder="AC, TV, Wi-Fi" />
            </div>
            <SubmitButton variant="secondary">Add template</SubmitButton>
          </form>
        </Card>

        <Card>
          <CardHeader title="Menu category templates" />
          {!menuCategoryTemplates?.length ? (
            <EmptyState>No menu category templates yet.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {menuCategoryTemplates.map((t) => (
                <div key={t.id} className="px-5 py-2 text-sm text-gray-700">
                  {t.name}
                </div>
              ))}
            </div>
          )}
          <form action={createMenuCategoryTemplate} className="space-y-2 border-t border-gray-100 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Starters" />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input name="sort_order" type="number" defaultValue={0} />
            </div>
            <SubmitButton variant="secondary">Add template</SubmitButton>
          </form>
        </Card>

        <Card>
          <CardHeader title="Banquet package templates" />
          {!banquetPackageTemplates?.length ? (
            <EmptyState>No banquet package templates yet.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {banquetPackageTemplates.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-2 text-sm">
                  <span className="text-gray-700">{t.name}</span>
                  <span className="text-gray-500">{formatMoney(t.price_per_cover, org.currency)}/cover</span>
                </div>
              ))}
            </div>
          )}
          <form action={createBanquetPackageTemplate} className="space-y-2 border-t border-gray-100 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Rajasthani Thali" />
            </div>
            <div>
              <Label>Description</Label>
              <Input name="description" placeholder="What's included" />
            </div>
            <div>
              <Label>Price / cover</Label>
              <Input name="price_per_cover" type="number" min={0} step="0.01" required />
            </div>
            <SubmitButton variant="secondary">Add template</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}

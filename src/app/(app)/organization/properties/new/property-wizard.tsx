"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  wizardCreateProperty,
  wizardCreateBuilding,
  wizardCreateFloor,
  wizardCreateRoomType,
  wizardCreateRoom,
  wizardCreateRestaurant,
} from "@/app/actions/property-wizard";
import { updateOwnProperty } from "@/app/actions/staff";
import { CURRENCIES } from "@/lib/currencies";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, Badge, Input, Label, Select, Button, EmptyState } from "@/components/ui";

type Step = "property" | "buildings" | "room-types" | "rooms" | "restaurants" | "done";
const STEPS: { key: Step; label: string }[] = [
  { key: "property", label: "Property" },
  { key: "buildings", label: "Buildings & Floors" },
  { key: "room-types", label: "Room Types" },
  { key: "rooms", label: "Rooms" },
  { key: "restaurants", label: "Restaurants" },
  { key: "done", label: "Done" },
];

type Building = { id: string; name: string; floors: { id: string; name: string }[] };
type RoomType = { id: string; name: string; base_rate: number };
type Room = { id: string; room_number: string };
type Restaurant = { id: string; name: string };

function Stepper({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((s, i) => (
        <span key={s.key} className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 font-medium ${
              i === idx ? "bg-accent-soft text-accent" : i < idx ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
            }`}
          >
            {i + 1}. {s.label}
          </span>
          {i < STEPS.length - 1 && <span className="text-gray-300">→</span>}
        </span>
      ))}
    </div>
  );
}

export function PropertyWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("property");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [property, setProperty] = useState<{ id: string; name: string; code: string; currency: string } | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const allFloors = buildings.flatMap((b) => b.floors.map((f) => ({ ...f, buildingName: b.name })));

  async function run<T>(fn: () => Promise<T>, onSuccess: (result: T) => void, form?: HTMLFormElement) {
    setError(null);
    setPending(true);
    try {
      const result = await fn();
      onSuccess(result);
      form?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function handleCreateProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    await run(
      () => wizardCreateProperty(new FormData(form)),
      (p) => {
        setProperty(p);
        setStep("buildings");
      },
    );
  }

  async function handleAddBuilding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    await run(
      () => wizardCreateBuilding(property!.id, new FormData(form)),
      (b) => setBuildings((prev) => [...prev, { ...b, floors: [] }]),
      form,
    );
  }

  async function handleAddFloor(buildingId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    await run(
      () => wizardCreateFloor(buildingId, new FormData(form)),
      (f) => setBuildings((prev) => prev.map((b) => (b.id === buildingId ? { ...b, floors: [...b.floors, f] } : b))),
      form,
    );
  }

  async function handleAddRoomType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    await run(
      () => wizardCreateRoomType(property!.id, new FormData(form)),
      (rt) => setRoomTypes((prev) => [...prev, rt]),
      form,
    );
  }

  async function handleAddRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    await run(
      () => wizardCreateRoom(property!.id, new FormData(form)),
      (r) => setRooms((prev) => [...prev, r]),
      form,
    );
  }

  async function handleAddRestaurant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    await run(
      () => wizardCreateRestaurant(property!.id, new FormData(form)),
      (r) => setRestaurants((prev) => [...prev, r]),
      form,
    );
  }

  async function handleSwitchInto() {
    if (!property) return;
    setPending(true);
    await updateOwnProperty(property.id);
    router.push("/rooms");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <Stepper current={step} />
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {step === "property" && (
        <Card>
          <CardHeader title="1. Property details" />
          <form onSubmit={handleCreateProperty} className="space-y-2 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Jaipur Palace" />
            </div>
            <div>
              <Label>Code</Label>
              <Input name="code" required placeholder="e.g. JAI" maxLength={10} />
            </div>
            <div>
              <Label>City</Label>
              <Input name="city" />
            </div>
            <div>
              <Label>Address</Label>
              <Input name="address" />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input name="gstin" />
            </div>
            <div>
              <Label>Currency</Label>
              <Select name="currency" defaultValue="INR">
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create property & continue"}
            </Button>
          </form>
        </Card>
      )}

      {step === "buildings" && property && (
        <Card>
          <CardHeader title={`2. Buildings & floors — ${property.name}`} />
          <div className="px-5 py-4">
            {!buildings.length ? (
              <EmptyState>No buildings yet.</EmptyState>
            ) : (
              <div className="mb-4 space-y-3">
                {buildings.map((b) => (
                  <div key={b.id} className="rounded-md border border-gray-100 p-3">
                    <div className="text-sm font-medium text-gray-900">{b.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {b.floors.map((f) => (
                        <span key={f.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {f.name}
                        </span>
                      ))}
                      {!b.floors.length && <span className="text-xs text-gray-400">No floors yet</span>}
                    </div>
                    <form onSubmit={(e) => handleAddFloor(b.id, e)} className="mt-2 flex items-end gap-2">
                      <Input name="name" placeholder="Floor name, e.g. 3" required className="h-7 w-32 text-xs" />
                      <Input name="sort_order" type="number" placeholder="Order" className="h-7 w-20 text-xs" />
                      <button type="submit" disabled={pending} className="text-xs text-accent hover:underline disabled:opacity-50">
                        Add floor
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddBuilding} className="flex items-end gap-2 border-t border-gray-100 pt-3">
              <div className="flex-1">
                <Label>New building</Label>
                <Input name="name" required placeholder="e.g. Tower B" />
              </div>
              <Button type="submit" variant="secondary" disabled={pending}>
                Add building
              </Button>
            </form>
          </div>
          <div className="flex justify-between border-t border-gray-100 px-5 py-3">
            <Button variant="ghost" onClick={() => setStep("property")}>
              Back
            </Button>
            <Button onClick={() => setStep("room-types")}>Next: Room types</Button>
          </div>
        </Card>
      )}

      {step === "room-types" && property && (
        <Card>
          <CardHeader title="3. Room types" />
          <div className="px-5 py-4">
            {!roomTypes.length ? (
              <EmptyState>No room types yet.</EmptyState>
            ) : (
              <div className="mb-4 divide-y divide-gray-50">
                {roomTypes.map((rt) => (
                  <div key={rt.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-700">{rt.name}</span>
                    <span className="text-gray-500">{formatMoney(rt.base_rate, property.currency)}/night</span>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddRoomType} className="space-y-2 border-t border-gray-100 pt-3">
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
              <Button type="submit" variant="secondary" disabled={pending}>
                Add room type
              </Button>
            </form>
          </div>
          <div className="flex justify-between border-t border-gray-100 px-5 py-3">
            <Button variant="ghost" onClick={() => setStep("buildings")}>
              Back
            </Button>
            <Button onClick={() => setStep("rooms")}>Next: Rooms</Button>
          </div>
        </Card>
      )}

      {step === "rooms" && property && (
        <Card>
          <CardHeader title="4. Rooms" />
          <div className="px-5 py-4">
            {!rooms.length ? (
              <EmptyState>No rooms yet.</EmptyState>
            ) : (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {rooms.map((r) => (
                  <Badge key={r.id}>{r.room_number}</Badge>
                ))}
              </div>
            )}
            {!allFloors.length || !roomTypes.length ? (
              <p className="text-sm text-gray-400">
                Add at least one floor and one room type before adding rooms — or skip this step for now.
              </p>
            ) : (
              <form onSubmit={handleAddRoom} className="flex items-end gap-2 border-t border-gray-100 pt-3">
                <div className="w-28">
                  <Label>Room #</Label>
                  <Input name="room_number" required placeholder="104" />
                </div>
                <div className="flex-1">
                  <Label>Floor</Label>
                  <Select name="floor_id" required>
                    <option value="">Select floor…</option>
                    {allFloors.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.buildingName} / {f.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Type</Label>
                  <Select name="room_type_id" required>
                    <option value="">Select type…</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" variant="secondary" disabled={pending}>
                  Add room
                </Button>
              </form>
            )}
          </div>
          <div className="flex justify-between border-t border-gray-100 px-5 py-3">
            <Button variant="ghost" onClick={() => setStep("room-types")}>
              Back
            </Button>
            <Button onClick={() => setStep("restaurants")}>Next: Restaurants</Button>
          </div>
        </Card>
      )}

      {step === "restaurants" && property && (
        <Card>
          <CardHeader title="5. Restaurants" />
          <div className="px-5 py-4">
            {!restaurants.length ? (
              <EmptyState>No restaurants yet.</EmptyState>
            ) : (
              <div className="mb-4 divide-y divide-gray-50">
                {restaurants.map((r) => (
                  <div key={r.id} className="py-2 text-sm text-gray-700">
                    {r.name}
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddRestaurant} className="space-y-2 border-t border-gray-100 pt-3">
              <div>
                <Label>Name</Label>
                <Input name="name" required placeholder="e.g. Rooftop Grill" />
              </div>
              <div>
                <Label>Description</Label>
                <Input name="description" placeholder="Cuisine / concept" />
              </div>
              <Button type="submit" variant="secondary" disabled={pending}>
                Add restaurant
              </Button>
            </form>
          </div>
          <div className="flex justify-between border-t border-gray-100 px-5 py-3">
            <Button variant="ghost" onClick={() => setStep("rooms")}>
              Back
            </Button>
            <Button onClick={() => setStep("done")}>Finish</Button>
          </div>
        </Card>
      )}

      {step === "done" && property && (
        <Card>
          <CardHeader title="Property set up" />
          <div className="space-y-3 px-5 py-4">
            <p className="text-sm text-gray-700">
              <strong>{property.name}</strong> ({property.code}) is ready with {buildings.length} building
              {buildings.length === 1 ? "" : "s"}, {allFloors.length} floor{allFloors.length === 1 ? "" : "s"},{" "}
              {roomTypes.length} room type{roomTypes.length === 1 ? "" : "s"}, {rooms.length} room
              {rooms.length === 1 ? "" : "s"}, and {restaurants.length} restaurant{restaurants.length === 1 ? "" : "s"}.
            </p>
            <p className="text-xs text-gray-400">
              Kitchens, corporate template adoption, and staff assignment are managed separately from Organization →
              Kitchens / Corporate Templates / Staff Accounts once you&apos;re working inside this property.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button disabled={pending} onClick={handleSwitchInto}>
                Switch into this property now
              </Button>
              <Button variant="secondary" onClick={() => router.push(`/organization/properties/${property.id}`)}>
                View property details
              </Button>
              <Button variant="ghost" onClick={() => router.push("/organization/properties")}>
                Back to properties list
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

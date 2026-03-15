"use client";

import { useEffect, useState } from "react";

export default function BookingDetail({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<any>(null);

  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");

  async function load() {
    const res = await fetch(`/api/partner/bookings/${params.id}`);
    const json = await res.json();

    setBooking(json.data);

    setDriverName(json.data.driver_name || "");
    setDriverPhone(json.data.driver_phone || "");
    setVehiclePlate(json.data.vehicle_plate || "");
    setVehicleModel(json.data.vehicle_model || "");
  }

  async function saveDriver() {
    await fetch(`/api/partner/bookings/${params.id}`, {
      method: "POST",
      body: JSON.stringify({
        driver_name: driverName,
        driver_phone: driverPhone,
        vehicle_plate: vehiclePlate,
        vehicle_model: vehicleModel,
      }),
    });

    alert("Driver assigned");
  }

  useEffect(() => {
    load();
  }, []);

  if (!booking) return <div className="p-8">Loading...</div>;

  const req = booking.customer_requests;

  return (
    <div className="space-y-6">

      <div className="rounded-3xl bg-white p-8 shadow">

        <h1 className="text-2xl font-semibold text-[#003768] mb-6">
          Booking Detail
        </h1>

        <div className="grid grid-cols-2 gap-8">

          <div className="space-y-3">

            <p><b>Pickup:</b> {req.pickup_address}</p>
            <p><b>Dropoff:</b> {req.dropoff_address}</p>

            <p>
              <b>Pickup Time:</b>{" "}
              {new Date(req.pickup_at).toLocaleString()}
            </p>

            <p>
              <b>Dropoff Time:</b>{" "}
              {new Date(req.dropoff_at).toLocaleString()}
            </p>

            <p>
              <b>Passengers:</b> {req.passengers}
            </p>

            <p>
              <b>Bags:</b> {req.suitcases} suitcases / {req.hand_luggage} hand luggage
            </p>

            <p>
              <b>Vehicle Category:</b> {req.vehicle_category_name}
            </p>

          </div>

          <div className="space-y-6">

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <p><b>Booking Amount:</b> {booking.amount}</p>
              <p><b>Status:</b> {booking.booking_status}</p>
              <p><b>Bid Notes:</b> {booking.notes || "—"}</p>
            </div>

            <div className="space-y-3">

              <h3 className="font-semibold">Assign Driver</h3>

              <input
                placeholder="Driver Name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />

              <input
                placeholder="Driver Phone"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />

              <input
                placeholder="Vehicle Plate"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />

              <input
                placeholder="Vehicle Model"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />

              <button
                onClick={saveDriver}
                className="bg-[#ff7a00] text-white px-4 py-2 rounded-lg"
              >
                Save Driver
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
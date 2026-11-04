// ─────────────────────────────────────────────────────────────
// VENDOR / FREELANCER SETUP: "Set up your business / profile" (design V05)
// File: src/components/auth/setup/ProviderSetupForm.tsx
//
// "Providers" = vendors and freelancers (PRD wording). They fill in the
// same things (PRD AC-03): a name, a category, the districts they work
// in, and services with indicative prices. Only the wording and the
// category list differ, so ONE form serves both, using the role prop.
// Continue -> /<role>/verification. The profile isn't saved yet (that
// needs our API); Continue marks setup as "profile" and Skip as "done",
// so the next log in knows where to send them.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "../Button";
import ChipGroup from "../ChipGroup";
import SelectField from "../SelectField";
import Stepper from "../Stepper";
import TextField from "../TextField";
import formStyles from "../Form.module.css";
import styles from "./Setup.module.css";
import { DISTRICTS } from "@/lib/districts";
import { ROLE_INFO } from "@/lib/roles";
import { authErrorMessage } from "@/lib/authErrors";
import { saveSetupStage } from "@/lib/session";

// Only vendors and freelancers use this form.
type ProviderRole = "vendor" | "freelancer";

// What changes between the two. Record<ProviderRole, ...> = one entry each.
const COPY: Record<ProviderRole, { title: string; nameLabel: string; namePlaceholder: string; categories: string[] }> = {
  vendor: {
    title: "Set up your business",
    nameLabel: "Business name",
    namePlaceholder: "Spice Route Catering",
    categories: ["F&B stall", "Catering", "Media agency", "Sound and lighting", "Décor", "Other"],
  },
  freelancer: {
    title: "Set up your profile",
    nameLabel: "Your name or stage name",
    namePlaceholder: "Dilshan Perera",
    categories: ["Photographer", "Videographer", "DJ", "MC", "Musician", "Make-up artist", "Other"],
  },
};

// One service, e.g. { name: "Crew catering", details: "Per head", price: 1500 }.
type Service = { id: number; name: string; details: string; price: number };

type Errors = {
  name?: string;
  category?: string;
  districts?: string;
  serviceName?: string;
  servicePrice?: string;
  form?: string;
};

// "LKR 15,000": Intl.NumberFormat adds the thousands commas Sri Lankan style.
const lkr = new Intl.NumberFormat("en-LK");

export default function ProviderSetupForm({ role }: { role: ProviderRole }) {
  const router = useRouter();
  const copy = COPY[role];

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string[]>([]); // ChipGroup uses a list, even for one choice
  const [districts, setDistricts] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  // The "Add a service" boxes.
  const [serviceName, setServiceName] = useState("");
  const [serviceDetails, setServiceDetails] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  // Save the setup stage, then move on. Shared by Continue and Skip.
  async function moveOn(stage: "profile" | "done", path: string) {
    setBusy(true);
    try {
      await saveSetupStage(stage);
      router.push(path);
    } catch (err) {
      setErrors({ ...errors, form: authErrorMessage(err) });
      setBusy(false);
    }
  }

  // ── DISTRICTS ────────────────────────────────────────────
  function addDistrict(district: string) {
    if (district && !districts.includes(district)) setDistricts([...districts, district]);
  }
  function removeDistrict(district: string) {
    setDistricts(districts.filter((d) => d !== district));
  }

  // ── SERVICES ─────────────────────────────────────────────
  function addService() {
    const price = Number(servicePrice); // "15000" -> 15000; "abc" -> NaN (not a number)
    const found: Errors = {};
    if (serviceName.trim() === "") found.serviceName = "Name the service.";
    // Number.isFinite rules out NaN; prices must be more than 0.
    if (!Number.isFinite(price) || price <= 0) found.servicePrice = "Enter a price in LKR.";
    if (Object.keys(found).length > 0) {
      setErrors({ ...errors, ...found });
      return;
    }

    // Date.now() = milliseconds since 1970, a quick unique id for the list key.
    setServices([...services, { id: Date.now(), name: serviceName.trim(), details: serviceDetails.trim(), price }]);
    // Clear the boxes and their errors for the next one.
    setServiceName("");
    setServiceDetails("");
    setServicePrice("");
    setErrors({ ...errors, serviceName: undefined, servicePrice: undefined });
  }

  function removeService(id: number) {
    setServices(services.filter((s) => s.id !== id));
  }

  // ── CONTINUE ─────────────────────────────────────────────
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Errors = {};
    if (name.trim() === "") found.name = "Enter the name organisers will see.";
    if (category.length === 0) found.category = "Pick a category.";
    if (districts.length === 0) found.districts = "Add at least one district.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // TODO (API step): save the profile.
    await moveOn("profile", `/${role}/verification`);
  }

  // Districts not yet chosen, for the "Add a district" list.
  const remainingDistricts = DISTRICTS.filter((d) => !districts.includes(d));

  return (
    <div>
      <Stepper steps={ROLE_INFO[role].steps} current={1} />
      <h2 className={formStyles.title}>{copy.title}</h2>
      <p className={formStyles.subtitle}>Next you upload documents for verification.</p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          id="provider-name"
          label={copy.nameLabel}
          placeholder={copy.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        {/* One category: multiple is left off, so these are radio buttons. */}
        <ChipGroup
          name="category"
          legend="Category"
          options={copy.categories}
          value={category}
          onChange={setCategory}
          error={errors.category}
        />

        {/* ── Districts served ── */}
        <section className={formStyles.field}>
          <h3 className={formStyles.sectionTitle}>Districts served</h3>
          {districts.length > 0 && (
            <div className={styles.chosen}>
              {districts.map((d) => (
                // Clicking a chosen district removes it. aria-label says so.
                <button key={d} type="button" className={styles.chosenChip} onClick={() => removeDistrict(d)} aria-label={`Remove ${d}`}>
                  {d} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
          {/* Picking from the list adds the district straight away. value=""
              keeps the list showing "Add a district" afterwards. */}
          <SelectField
            id="add-district"
            label="Add a district"
            options={remainingDistricts}
            value=""
            onChange={addDistrict}
            placeholder="Choose a district"
            error={errors.districts}
          />
        </section>

        {/* ── Services and indicative prices ── */}
        <section className={formStyles.field}>
          <h3 className={formStyles.sectionTitle}>Services and indicative prices</h3>
          {services.length > 0 && (
            <ul className={styles.list}>
              {services.map((service) => (
                <li key={service.id} className={styles.item}>
                  <span className={styles.itemText}>
                    <span className={styles.itemTitle}>{service.name}</span>
                    {service.details && <span className={styles.itemSub}>{service.details}</span>}
                  </span>
                  <span className={styles.price}>from LKR {lkr.format(service.price)}</span>
                  <Button variant="outline" size="small" block={false} onClick={() => removeService(service.id)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {/* A small form inside the form, so it uses a <div> (forms can't be
              nested) and its button is type="button", not submit. */}
          <div className={formStyles.card}>
            <h4 className={formStyles.cardTitle}>Add a service</h4>
            <div className={styles.addService}>
              <TextField
                id="service-name"
                label="Service"
                placeholder="Food stall (per event day)"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                error={errors.serviceName}
              />
              <TextField
                id="service-price"
                label="From (LKR)"
                inputMode="numeric"
                placeholder="15000"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                error={errors.servicePrice}
              />
            </div>
            <TextField
              id="service-details"
              label="Details (optional)"
              placeholder="Kottu, short eats, drinks"
              value={serviceDetails}
              onChange={(e) => setServiceDetails(e.target.value)}
            />
            <Button variant="outline" size="small" block={false} onClick={addService}>
              + Add service
            </Button>
          </div>
        </section>

        {errors.form && (
          <p className={formStyles.error} role="alert">
            {errors.form}
          </p>
        )}

        <div className={formStyles.actions}>
          {/* Skip: finish later from the home page. */}
          <Button variant="outline" onClick={() => moveOn("done", `/${role}/home`)} disabled={busy}>
            Skip for now
          </Button>
          <Button type="submit" disabled={busy}>
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}

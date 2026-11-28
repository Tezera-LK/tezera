import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import styles from "@/components/portal/provider/Provider.module.css";
import StallMap from "@/components/portal/provider/StallMap";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { StallListing } from "@/lib/data/provider-types";
import { previewMode } from "@/lib/preview";
import { lkr, organiserName } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { deleteItem, previewHideListing, saveItem, saveListingText } from "./actions";

export const metadata: Metadata = { title: "My stall listing" };

const TEXT = {
  title: (event: string) => `My stall at ${event}`,
  sub: (stall: string, zone: string, who: string) => `Stall ${stall} · ${zone} · approved by ${who}`,
  changeEvent: "Change event",
  hiddenChip: "Hidden by organiser",
  hiddenTitle: (who: string) => `${who} hid your listing`,
  hiddenReason: (reason: string) => `Reason: ${reason} Edit your items to show it again.`,
  listing: "Stall listing",
  short: "Short description",
  shortHint: "120 characters max · shown on the map and the event page",
  items: "Items and prices for this event",
  profilePrices: "Use prices from my profile",
  edit: "Edit",
  remove: "Remove",
  breaks: "breaks event rules",
  soldOut: "Sold out",
  addItem: "+ Add an item",
  onlyApproved: "Only approved stalls are listed",
  organiserCanHide: "The organiser can hide entries that break the event rules.",
  save: "Save listing",
  saveAndAsk: "Save and ask to show it again",
  saved: "Saved. Guests see the new listing on the map and the event page.",
  viewEvent: "View event page",
  messageOrganiser: "Message organiser",
  venueMap: "Venue map",
  openMap: "Open the full map",
  mapNote: "Your stall number shows on the venue map and the event page. ‘Find on map’ from the vendor list jumps here.",
  consumersSee: "What consumers see",
  stallLine: (stall: string, type: string) => `Stall ${stall} · ${type}`,
  viewProfile: "View profile ›",
  foundBy: "Found by item search",
  foundNote: (word: string, zone: string, type: string) => `Searching ‘${word}’ highlights your stall. You are also in ${zone}’s stall list and the ${type} filter.`,
  rules: "Event rules",
  previewTitle: "Preview only: the organiser's side",
  previewText: "Until organisers can moderate listings, hide this one here to see what happens.",
  previewHide: "Hide it as the organiser",
  noneYetTitle: "No approved stall yet",
  noneYetText: "Once an organiser approves a stall and gives it a number, you set up its listing here.",
  goStalls: "See stall slots",
  errors: {
    long: "Keep the description to 120 characters.",
    rules: "Remove the items that break the event rules first.",
    fields: "Give the item a name and a price.",
  } as Record<string, string>,
  // V77
  close: "Close",
  addTitle: "Add an item",
  editTitle: "Edit item",
  itemSub: (event: string, stall: string) => `${event} · stall ${stall}`,
  itemName: "Item name",
  type: "Type",
  words: "Search words",
  wordsHint: "Guests searching these find your stall",
  price: "Price for this event",
  soldOutHint: "Hides it from item search until you switch it back",
  deleteItem: "Delete item",
  cancel: "Cancel",
  saveItem: "Save item",
} as const;

const ITEM_TYPES = ["Main", "Short eat", "Drink", "Dessert", "Other"];

type Props = { searchParams: Promise<{ stall?: string; dialog?: string; item?: string; error?: string; saved?: string; pick?: string }> };

// My stall listing (Figma V15, vendors only): what guests see for one approved stall, its items
// and prices, and where it is on the map. Hidden by the organiser (V82) when an item breaks the
// event rules. Adding or editing an item (V77) opens as a dialog.
export default async function ListingPage({ searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  if (session.role === "freelancer") redirect(routes.vendorArea.requests);
  const state = await getProviderState(session);
  const q = await searchParams;

  const approved = (state?.stalls ?? []).filter((s) => s.application?.status === "approved" && s.application.stall);
  const stall = approved.find((s) => s.id === q.stall) ?? approved[0];
  if (!state || !stall?.application?.stall) {
    return (
      <>
        <header className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>My stall listing</h1>
        </header>
        <EmptyState title={TEXT.noneYetTitle} description={TEXT.noneYetText} />
        <Link href={routes.vendorArea.stalls} className={forms.bigButton}>
          {TEXT.goStalls}
        </Link>
      </>
    );
  }

  const number = stall.application.stall;
  const listing: StallListing = state.listings.find((l) => l.stallId === stall.id) ?? { stallId: stall.id, description: "", useProfilePrices: false, items: [], hidden: null };
  const event = state.events.find((e) => e.id === stall.eventId);
  const who = organiserName(state, stall.organiserId);
  const here = `${routes.vendorArea.listing}?stall=${stall.id}`;
  const editing = listing.items.find((i) => i.id === q.item);
  const firstWord = listing.items.flatMap((i) => i.searchWords)[0] ?? "";
  const zone = event?.zones.find((z) => z.stalls.includes(number));

  const preview = previewMode && !listing.hidden && (
    <Panel title={TEXT.previewTitle}>
      <p className={styles.foot}>{TEXT.previewText}</p>
      <form action={previewHideListing.bind(null, stall.id)}>
        <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
          {TEXT.previewHide}
        </button>
      </form>
    </Panel>
  );

  const aside = listing.hidden ? (
    <Panel title={TEXT.rules}>
      {(event?.rules ?? []).map((rule) => (
        <div key={rule} className={hiring.whiteRow}>
          <span className={ui.rowTitle}>{rule}</span>
        </div>
      ))}
    </Panel>
  ) : (
    <>
      {event && (
        <Panel title={TEXT.venueMap}>
          <StallMap zones={event.zones.filter((z) => z.stalls.includes(number) || z.stalls.length === 0)} mine={number} small />
          <Link href={routes.vendorArea.venueMap} className={ui.wideButton}>
            {TEXT.openMap}
          </Link>
          <p className={styles.foot}>{TEXT.mapNote}</p>
        </Panel>
      )}
      <Panel title={TEXT.consumersSee}>
        <div className={`${events.card} ${styles.stack}`}>
          <span className={styles.inline}>
            <Thumb size={36} shape="round" />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{state.profile.name}</span>
              <span className={hiring.sub}>{TEXT.stallLine(number, stall.application.type)}</span>
            </span>
          </span>
          {listing.description && <p className={styles.foot}>{listing.description}</p>}
          {listing.items
            .filter((i) => !i.soldOut)
            .slice(0, 2)
            .map((i) => (
              <span key={i.id} className={hiring.cardHead}>
                <span className={styles.foot}>{i.name}</span>
                <span className={styles.amount}>{lkr(i.priceLkr)}</span>
              </span>
            ))}
          <Link href={routes.vendorArea.profilePreview} className={ui.textLink}>
            {TEXT.viewProfile}
          </Link>
        </div>
      </Panel>
      {firstWord && zone && (
        <Panel title={TEXT.foundBy}>
          <span className={`${forms.input} ${styles.inline} ${styles.whiteField}`}>{firstWord}</span>
          <p className={styles.foot}>{TEXT.foundNote(firstWord, zone.name, stall.application.type)}</p>
        </Panel>
      )}
      {preview}
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <header className={hiring.pageHead}>
          <div className={hiring.pageHeadText}>
            <h1 className={hiring.pageTitle}>{TEXT.title(stall.eventTitle)}</h1>
            <p className={hiring.lede}>{TEXT.sub(number, stall.application.zone || zone?.name || "", who)}</p>
          </div>
          {listing.hidden ? (
            <Chip tone="danger">{TEXT.hiddenChip}</Chip>
          ) : (
            approved.length > 1 && (
              <Link href={`${here}&pick=1`} className={ui.rowButton}>
                {TEXT.changeEvent}
              </Link>
            )
          )}
        </header>
        {q.pick && approved.length > 1 && (
          <div className={styles.pills}>
            {approved.map((s) => (
              <Link key={s.id} href={`${routes.vendorArea.listing}?stall=${s.id}`} className={`${styles.pill} ${s.id === stall.id ? styles.pillOn : ""}`}>
                {s.eventTitle}
              </Link>
            ))}
          </div>
        )}
        {listing.hidden && (
          <div className={`${styles.banner} ${styles.dangerBanner}`}>
            <span className={styles.bannerText}>
              <span className={ui.rowTitle}>{TEXT.hiddenTitle(who)}</span>
              <span className={hiring.sub}>{TEXT.hiddenReason(listing.hidden.reason)}</span>
            </span>
          </div>
        )}
        {q.saved && (
          <p className={styles.foot} role="status">
            {TEXT.saved}
          </p>
        )}
        {q.error && q.dialog !== "item" && TEXT.errors[q.error] && (
          <p className={forms.error} role="alert">
            {TEXT.errors[q.error]}
          </p>
        )}

        <form action={saveListingText.bind(null, stall.id)} className={styles.stack}>
          {!listing.hidden && (
            <section className={forms.card} aria-labelledby="listing-title">
              <h2 id="listing-title" className={hiring.cardTitle}>
                {TEXT.listing}
              </h2>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.short}</span>
                <textarea name="description" rows={2} maxLength={120} defaultValue={listing.description} className={forms.input} />
                <span className={forms.hint}>{TEXT.shortHint}</span>
              </label>
            </section>
          )}
          {listing.hidden && <input type="hidden" name="description" value={listing.description} />}

          <section className={forms.card} aria-labelledby="items-title">
            <div className={hiring.cardHead}>
              <h2 id="items-title" className={hiring.cardTitle}>
                {TEXT.items}
              </h2>
              {!listing.hidden && (
                <label className={styles.inline}>
                  <span className={hiring.sub}>{TEXT.profilePrices}</span>
                  <span className={forms.switch}>
                    <input type="checkbox" name="profilePrices" defaultChecked={listing.useProfilePrices} aria-label={TEXT.profilePrices} />
                  </span>
                </label>
              )}
            </div>
            {listing.items.map((i) => (
              <div key={i.id} className={styles.greyRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{i.name}</span>
                  <span className={hiring.sub}>{i.breaksRules ? `${i.kind} · ${TEXT.breaks}` : i.kind}</span>
                </span>
                {i.soldOut && <Chip tone="neutral">{TEXT.soldOut}</Chip>}
                <span className={styles.amount}>{lkr(i.priceLkr)}</span>
                {i.breaksRules ? (
                  <button type="submit" formAction={deleteItem.bind(null, stall.id, i.id)} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                    {TEXT.remove}
                  </button>
                ) : (
                  <Link href={`${here}&dialog=item&item=${i.id}`} scroll={false} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                    {TEXT.edit}
                  </Link>
                )}
              </div>
            ))}
            {!listing.hidden && (
              <Link href={`${here}&dialog=item`} scroll={false} className={ui.textLink}>
                {TEXT.addItem}
              </Link>
            )}
          </section>

          {!listing.hidden && (
            <div className={`${styles.banner} ${styles.infoBanner}`}>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.bannerText}>
                <span className={ui.rowTitle}>{TEXT.onlyApproved}</span>
                <span className={hiring.sub}>{TEXT.organiserCanHide}</span>
              </span>
            </div>
          )}

          <div className={styles.pair}>
            <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {listing.hidden ? TEXT.saveAndAsk : TEXT.save}
            </button>
            {listing.hidden ? (
              <Link href={`${routes.vendorArea.messages}?to=${stall.organiserId}`} className={forms.bigButton}>
                {TEXT.messageOrganiser}
              </Link>
            ) : (
              stall.eventId && (
                <Link href={routes.vendorArea.event(stall.eventId)} className={forms.bigButton}>
                  {TEXT.viewEvent}
                </Link>
              )
            )}
          </div>
        </form>
      </Columns>

      {q.dialog === "item" && (
        <Dialog title={editing ? TEXT.editTitle : TEXT.addTitle} subtitle={TEXT.itemSub(stall.eventTitle, number)} closeHref={here} closeLabel={TEXT.close} narrow>
          <form action={saveItem.bind(null, stall.id, editing?.id ?? null)} className={tables.dialogForm}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.itemName}</span>
              <input name="name" required defaultValue={editing?.name ?? ""} className={forms.input} />
            </label>
            <fieldset className={hiring.plainFieldset}>
              <legend className={forms.label}>{TEXT.type}</legend>
              <div className={styles.pills}>
                {ITEM_TYPES.map((t) => (
                  <Choice key={t} type="radio" name="kind" value={t} title={t} defaultChecked={(editing?.kind ?? "Main") === t} />
                ))}
              </div>
            </fieldset>
            <div className={forms.row2}>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.words}</span>
                <input name="words" defaultValue={editing?.searchWords.join(", ") ?? ""} className={forms.input} />
                <span className={forms.hint}>{TEXT.wordsHint}</span>
              </label>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.price}</span>
                <input name="price" inputMode="numeric" required defaultValue={editing?.priceLkr ?? ""} className={forms.input} />
              </label>
            </div>
            <Choice type="checkbox" name="soldOut" value="yes" title={TEXT.soldOut} hint={TEXT.soldOutHint} defaultChecked={editing?.soldOut} />
            {q.error === "fields" && <p className={forms.error}>{TEXT.errors.fields}</p>}
            <div className={tables.dialogActions}>
              {editing && (
                <button type="submit" formAction={deleteItem.bind(null, stall.id, editing.id)} formNoValidate className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
                  {TEXT.deleteItem}
                </button>
              )}
              <Link href={here} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
                {TEXT.cancel}
              </Link>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.saveItem}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

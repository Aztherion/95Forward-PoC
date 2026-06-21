"use client";

import { useActionState, useState } from "react";
import { DoorOpen, Plus, UserCog } from "lucide-react";
import { Button, Card, FormRow, Input, RoleChip, Select } from "@/components/ds";
import {
  addNaturalPartnerAction,
  assignRmAction,
  removeNaturalPartnerAction,
  type FormState,
} from "@/server/actions/prospects";

interface Ref {
  id: string;
  name: string;
}

interface Partner {
  id: string;
  name: string | null;
  role: string | null;
  warmPathNote: string | null;
}

const initialState: FormState = {};

function AssignRm({
  prospectId,
  rmUserId,
  rmName,
  rmUsers,
}: {
  prospectId: string;
  rmUserId: string | null;
  rmName: string | null;
  rmUsers: Ref[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(assignRmAction, initialState);

  if (state.ok && open) setOpen(false);

  const options = rmUsers.map((user) => ({ value: user.id, label: user.name }));

  return (
    <div className="f95-stack f95-stack--sm">
      <div className="f95-cluster">
        <span className="f95-deflist__term">Relationship manager · operational owner</span>
        <span className="f95-recordbar__spacer" />
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<UserCog size={15} strokeWidth={1.8} />}
          onClick={() => setOpen((value) => !value)}
        >
          {rmName ? "Reassign" : "Assign RM"}
        </Button>
      </div>

      {rmName ? (
        <div className="f95-cluster">
          <RoleChip role="manager" name={rmName} />
        </div>
      ) : (
        <span className="f95-deflist__desc--empty">
          No RM yet — assign who owns this relationship.
        </span>
      )}

      {open ? (
        <Card>
          <form action={formAction} className="f95-inline-form">
            <input type="hidden" name="prospectId" value={prospectId} />
            <Select
              name="rmUserId"
              label="Relationship manager"
              placeholder="No manager"
              defaultValue={rmUserId ?? ""}
              options={options}
              error={state.fieldErrors?.rmUserId}
            />
            <div className="f95-cluster">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Saving" : "Save"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

function AddPartner({ prospectId, partners }: { prospectId: string; partners: Partner[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addNaturalPartnerAction, initialState);

  if (state.ok && open) setOpen(false);

  const errors = state.fieldErrors ?? {};

  return (
    <div className="f95-stack f95-stack--sm">
      <div className="f95-cluster">
        <span className="f95-deflist__term">Natural partners · relational leverage</span>
        <span className="f95-recordbar__spacer" />
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<Plus size={15} strokeWidth={1.8} />}
          onClick={() => setOpen((value) => !value)}
        >
          Add natural partner
        </Button>
      </div>

      {partners.length === 0 ? (
        <span className="f95-deflist__desc--empty">
          No natural partner yet — who can open the door?
        </span>
      ) : (
        <div className="f95-stack f95-stack--sm">
          {partners.map((partner) => (
            <div key={partner.id} className="f95-itemrow">
              <div className="f95-itemrow__body">
                <RoleChip role="partner" name={partner.name ?? "Unnamed partner"} />
                <span className="f95-itemrow__meta">
                  {partner.role ? <span>{partner.role}</span> : null}
                  {partner.warmPathNote ? <span>· {partner.warmPathNote}</span> : null}
                </span>
              </div>
              <div className="f95-itemrow__actions">
                <form action={removeNaturalPartnerAction}>
                  <input type="hidden" name="id" value={partner.id} />
                  <input type="hidden" name="prospectId" value={prospectId} />
                  <Button variant="ghost" size="sm" type="submit">
                    Remove
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <Card>
          <form action={formAction} className="f95-inline-form">
            <input type="hidden" name="prospectId" value={prospectId} />
            <Input
              name="externalName"
              label="Partner name"
              placeholder="e.g. Tom Bradley"
              error={errors.externalName}
            />
            <FormRow columns={2}>
              <Input
                name="role"
                label="Role"
                optional
                placeholder="e.g. Board member"
                error={errors.role}
              />
              <Input
                name="warmPathNote"
                label="The warm path"
                optional
                placeholder="How they open the door"
                error={errors.warmPathNote}
              />
            </FormRow>
            <div className="f95-cluster">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Saving" : "Add partner"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

export function RelationshipTeam({
  prospectId,
  rmUserId,
  rmName,
  rmUsers,
  partners,
}: {
  prospectId: string;
  rmUserId: string | null;
  rmName: string | null;
  rmUsers: Ref[];
  partners: Partner[];
}) {
  return (
    <div className="f95-stack" data-testid="relationship-team">
      <div className="f95-cluster">
        <DoorOpen size={16} strokeWidth={1.8} />
        <h2 className="f95-section-title">Who carries this relationship</h2>
      </div>
      <AssignRm prospectId={prospectId} rmUserId={rmUserId} rmName={rmName} rmUsers={rmUsers} />
      <AddPartner prospectId={prospectId} partners={partners} />
    </div>
  );
}

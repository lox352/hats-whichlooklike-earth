import React, { useEffect, useId, useRef, useState } from "react";
import { updateSettings, useSettings } from "../projects/settings";
import { downloadBackup, maxBackupBytes, parseBackup, restoreBackup, type BackupPattern } from "../helpers/backups";
import Button from "./ui/Button";
import Dialog from "./ui/Dialog";
import "./KnittingSettings.css";

/**
 * Everything most knitters will never need, behind one button at the top of
 * every page, as Sweat Shop keeps it: how the chart is drawn, whether your
 * knitting is timed, and your hats kept safe in a file.
 */

const SettingRow: React.FC<{ title: string; detail?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  detail,
  children,
}) => (
  <li className="setting">
    <div className="setting-text">
      <span className="setting-title">{title}</span>
      {detail && <span className="setting-detail">{detail}</span>}
    </div>
    <div className="setting-control">{children}</div>
  </li>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (on: boolean) => void }> = ({
  label,
  checked,
  onChange,
}) => (
  <input
    type="checkbox"
    role="switch"
    className="switch"
    aria-label={label}
    checked={checked}
    onChange={(event) => onChange(event.target.checked)}
  />
);

const Backups: React.FC = () => {
  const [pending, setPending] = useState<BackupPattern[]>();
  const [message, setMessage] = useState("");
  const inputId = useId();
  return (
    <section className="settings-group" aria-labelledby={`${inputId}-heading`}>
      <h3 id={`${inputId}-heading`}>Your hats</h3>
      <p className="settings-note">
        Hats live in this browser only. A backup file moves them to another
        device, or keeps them safe if the browser's data is cleared.
      </p>
      <ul>
        <SettingRow title="Save a backup" detail="Every hat and the time it took, as one file.">
          <Button variant="secondary" onClick={downloadBackup}>
            Save
          </Button>
        </SettingRow>
        <SettingRow title="Restore from a backup" detail="Added as copies; nothing here is replaced.">
          <input
            id={inputId}
            className="visually-hidden"
            type="file"
            accept=".json,application/json"
            aria-label="Restore hats from a backup"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                if (file.size > maxBackupBytes) throw new Error("That backup is too large.");
                setPending(parseBackup(await file.text()));
                setMessage("");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Could not read that backup.");
              }
            }}
          />
          <label className="btn btn-secondary" htmlFor={inputId} aria-hidden="true">
            Choose file
          </label>
        </SettingRow>
      </ul>
      <p className="settings-message" role="status">
        {message}
      </p>
      {pending && (
        <Dialog
          open
          title="Restore this backup?"
          text={`${pending.length} ${pending.length === 1 ? "hat" : "hats"} will be added as separate copies. The hats already here are not replaced.`}
          confirmLabel="Restore copies"
          onCancel={() => setPending(undefined)}
          onConfirm={() => {
            const restored = restoreBackup(pending);
            setMessage(
              restored === pending.length
                ? `Restored ${restored} ${restored === 1 ? "copy" : "copies"}.`
                : `Restored ${restored} of ${pending.length}: this browser has no room for the rest.`,
            );
            setPending(undefined);
          }}
        />
      )}
    </section>
  );
};

const Gear: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

const KnittingSettings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const settings = useSettings();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      element.focus();
    }
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <button type="button" className="settings-button" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Gear />
        <span>Settings</span>
      </button>
      <dialog
        ref={ref}
        className="dialog settings-sheet"
        tabIndex={-1}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        {open && (
          <div className="settings-body">
            <div className="settings-head">
              <h2 className="dialog-title" id={titleId}>
                Settings
              </h2>
              <Button variant="quiet" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
            <section className="settings-group">
              <h3>Chart</h3>
              <ul>
                <SettingRow
                  title="High contrast"
                  detail="Draw the chart in white with each yarn numbered, for when the colours are hard to tell apart."
                >
                  <Toggle
                    label="High contrast chart"
                    checked={settings.highContrast}
                    onChange={(highContrast) => updateSettings({ highContrast })}
                  />
                </SettingRow>
                <SettingRow title="Written instructions" detail="Offer the chart as words too, a round at a time, below it.">
                  <Toggle
                    label="Written round instructions"
                    checked={settings.writtenRounds}
                    onChange={(writtenRounds) => updateSettings({ writtenRounds })}
                  />
                </SettingRow>
              </ul>
            </section>
            <section className="settings-group">
              <h3>Knitting time</h3>
              <ul>
                <SettingRow
                  title="Don't time my knitting"
                  detail="Stops timing your knitting, and hides how long each hat has taken and has left. Times already recorded stay with their hats, and come back if you turn this off again."
                >
                  <Toggle
                    label="Don't time my knitting"
                    checked={settings.noStatistics}
                    onChange={(noStatistics) => updateSettings({ noStatistics })}
                  />
                </SettingRow>
              </ul>
            </section>
            <Backups />
          </div>
        )}
      </dialog>
    </>
  );
};

export default KnittingSettings;

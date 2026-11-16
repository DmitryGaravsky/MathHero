import { liveQuery } from "dexie";
import { db, type MathHeroDB } from "./db";
import { patchPreferences, readPreferences, type Preferences } from "../settings/preferences";

const preferenceId = "preferences";

export class SettingsRepository {
  constructor(private readonly database: MathHeroDB = db) {}

  async read() {
    return readPreferences((await this.database.settings.get(preferenceId))?.value);
  }

  subscribe(next: (value: Preferences) => void, error: (reason: unknown) => void) {
    const subscription = liveQuery(() => this.read()).subscribe({ next, error });
    return () => subscription.unsubscribe();
  }

  patch(patch: Partial<Preferences>) {
    return this.database.transaction("rw", this.database.settings, async () => {
      const value = patchPreferences(await this.read(), patch);
      await this.database.settings.put({ id: preferenceId, value });
    });
  }
}

export const settingsRepository = new SettingsRepository();

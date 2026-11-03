/*
 * Storage.js — seul endroit qui lit/écrit les données d'entrées.
 * Parle à la base Supabase en ligne (synchronisée entre appareils).
 * getEntries() reste synchrone : elle lit un cache local mis à jour
 * après chaque appel réseau, pour ne pas avoir à réécrire tout
 * l'affichage de l'app en asynchrone.
 */

const Storage = (() => {
  let cachedEntries = [];

  function rowToEntry(row) {
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      date: row.date,
      rating: row.rating,
      medium: row.medium || "",
      location: row.location || "",
      notes: row.notes || "",
    };
  }

  function entryToRow(entry, userId) {
    return {
      user_id: userId,
      category: entry.category,
      title: entry.title,
      date: entry.date,
      rating: entry.rating,
      medium: entry.medium || null,
      location: entry.location || null,
      notes: entry.notes || "",
    };
  }

  function getEntries() {
    return cachedEntries;
  }

  async function refresh() {
    const { data, error } = await supabaseClient
      .from("inventory_entries")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Erreur de chargement des entrées :", error.message);
      return;
    }

    cachedEntries = data.map(rowToEntry);
  }

  async function addEntry(entry) {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from("inventory_entries")
      .insert(entryToRow(entry, user.id));

    if (error) {
      console.error("Erreur d'enregistrement :", error.message);
      return;
    }

    await refresh();
  }

  async function updateEntry(id, updates) {
    const { error } = await supabaseClient
      .from("inventory_entries")
      .update({
        category: updates.category,
        title: updates.title,
        date: updates.date,
        rating: updates.rating,
        medium: updates.medium || null,
        location: updates.location || null,
        notes: updates.notes || "",
      })
      .eq("id", id);

    if (error) {
      console.error("Erreur de modification :", error.message);
      return;
    }

    await refresh();
  }

  async function deleteEntry(id) {
    const { error } = await supabaseClient.from("inventory_entries").delete().eq("id", id);

    if (error) {
      console.error("Erreur de suppression :", error.message);
      return;
    }

    await refresh();
  }

  return {
    getEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    refresh,
  };
})();

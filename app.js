import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const wordListEl = document.getElementById("word-list");
const emptyStateEl = document.getElementById("empty-state");
const searchInputEl = document.getElementById("search-input");

const addDialogEl = document.getElementById("add-dialog");
const addFormEl = document.getElementById("add-form");
const openAddButtonEl = document.getElementById("open-add-button");
const cancelButtonEl = document.getElementById("cancel-button");
const assistButtonEl = document.getElementById("assist-button");
const illustrationButtonEl = document.getElementById("illustration-button");
const removeIllustrationButtonEl = document.getElementById("remove-illustration-button");
const illustrationPreviewEl = document.getElementById("illustration-preview");
const addStatusEl = document.getElementById("add-status");
const dialogTitleEl = document.getElementById("dialog-title");
const deleteWordButtonEl = document.getElementById("delete-word-button");

const termEl = document.getElementById("term");
const termYomiEl = document.getElementById("term_yomi");
const categoryEl = document.getElementById("category");
const meaningEl = document.getElementById("meaning");
const analogyEl = document.getElementById("analogy");

let words = [];
let pendingIllustrationUrl = "";
let editingId = null;

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function renderWords(list) {
  wordListEl.innerHTML = "";
  emptyStateEl.hidden = list.length > 0 || words.length > 0;

  if (words.length === 0) {
    emptyStateEl.hidden = false;
    emptyStateEl.textContent = "まだ単語がありません。右下の + から追加してください。";
    return;
  }
  if (list.length === 0) {
    emptyStateEl.hidden = false;
    emptyStateEl.textContent = "一致する単語が見つかりません。";
    return;
  }
  emptyStateEl.hidden = true;

  for (const word of list) {
    const li = document.createElement("li");
    li.className = "word-card";
    li.innerHTML = `
      ${
        word.illustration_url
          ? `<img src="${escapeHtml(word.illustration_url)}" alt="${escapeHtml(word.term)}のイラスト" />`
          : `<div class="thumb-placeholder"></div>`
      }
      <div class="terms">
        <div class="term-row">
          <div>
            <div class="term-main">${escapeHtml(word.term)}</div>
            ${word.term_yomi ? `<div class="term-yomi">${escapeHtml(word.term_yomi)}</div>` : ""}
            ${word.category ? `<div class="term-category">${escapeHtml(word.category)}</div>` : ""}
          </div>
          <button type="button" class="icon-button edit-button" aria-label="編集">✎</button>
        </div>
        <div class="details" hidden>
          ${word.meaning ? `<p><span class="label">意味・定義</span>${escapeHtml(word.meaning)}</p>` : ""}
          ${word.analogy ? `<p><span class="label">身近な例え</span>${escapeHtml(word.analogy)}</p>` : ""}
        </div>
      </div>
    `;
    li.addEventListener("click", () => {
      const details = li.querySelector(".details");
      details.hidden = !details.hidden;
    });
    li.querySelector(".edit-button").addEventListener("click", (event) => {
      event.stopPropagation();
      openEditDialog(word);
    });
    wordListEl.appendChild(li);
  }
}

function applySearch() {
  const query = searchInputEl.value.trim().toLowerCase();
  if (!query) {
    renderWords(words);
    return;
  }
  const filtered = words.filter(
    (w) =>
      w.term?.toLowerCase().includes(query) ||
      w.term_yomi?.toLowerCase().includes(query) ||
      w.category?.toLowerCase().includes(query)
  );
  renderWords(filtered);
}

async function loadWords() {
  const { data, error } = await supabase
    .from("words")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    emptyStateEl.hidden = false;
    emptyStateEl.textContent = "読み込みに失敗しました。config.jsの設定を確認してください。";
    return;
  }
  words = data ?? [];
  applySearch();
}

function resetForm() {
  addFormEl.reset();
  editingId = null;
  pendingIllustrationUrl = "";
  illustrationPreviewEl.hidden = true;
  illustrationPreviewEl.src = "";
  removeIllustrationButtonEl.hidden = true;
  deleteWordButtonEl.hidden = true;
  dialogTitleEl.textContent = "単語を追加";
  addStatusEl.textContent = "";
}

function openEditDialog(word) {
  resetForm();
  editingId = word.id;
  dialogTitleEl.textContent = "単語を編集";
  deleteWordButtonEl.hidden = false;
  termEl.value = word.term ?? "";
  termYomiEl.value = word.term_yomi ?? "";
  categoryEl.value = word.category ?? "";
  meaningEl.value = word.meaning ?? "";
  analogyEl.value = word.analogy ?? "";
  pendingIllustrationUrl = word.illustration_url ?? "";
  if (pendingIllustrationUrl) {
    illustrationPreviewEl.src = pendingIllustrationUrl;
    illustrationPreviewEl.hidden = false;
    removeIllustrationButtonEl.hidden = false;
  }
  addDialogEl.showModal();
}

openAddButtonEl.addEventListener("click", () => {
  resetForm();
  addDialogEl.showModal();
});

cancelButtonEl.addEventListener("click", () => {
  addDialogEl.close();
});

removeIllustrationButtonEl.addEventListener("click", () => {
  pendingIllustrationUrl = "";
  illustrationPreviewEl.hidden = true;
  illustrationPreviewEl.src = "";
  removeIllustrationButtonEl.hidden = true;
  addStatusEl.textContent = "画像を削除しました（保存すると反映されます）。";
});

deleteWordButtonEl.addEventListener("click", async () => {
  if (!editingId) return;
  if (!confirm("この単語を削除します。よろしいですか？")) return;
  deleteWordButtonEl.disabled = true;
  const { error } = await supabase.from("words").delete().eq("id", editingId);
  deleteWordButtonEl.disabled = false;
  if (error) {
    console.error(error);
    addStatusEl.textContent = "削除に失敗しました。";
    return;
  }
  addDialogEl.close();
  await loadWords();
});

searchInputEl.addEventListener("input", applySearch);

async function callEdgeFunction(name, payload) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `${name} failed`);
  }
  return response.json();
}

assistButtonEl.addEventListener("click", async () => {
  if (!termEl.value.trim()) {
    addStatusEl.textContent = "先に用語を入力してください。";
    return;
  }
  assistButtonEl.disabled = true;
  addStatusEl.textContent = "AIが提案を考えています...";
  try {
    const result = await callEdgeFunction("assist-word", {
      term: termEl.value.trim(),
      term_yomi: termYomiEl.value.trim(),
    });
    if (result.term_yomi && !termYomiEl.value.trim()) termYomiEl.value = result.term_yomi;
    if (result.category && !categoryEl.value.trim()) categoryEl.value = result.category;
    if (result.meaning) meaningEl.value = result.meaning;
    if (result.analogy) analogyEl.value = result.analogy;
    addStatusEl.textContent = "提案を反映しました。内容を確認して編集してください。";
  } catch (err) {
    console.error(err);
    addStatusEl.textContent = "AI提案の取得に失敗しました。";
  } finally {
    assistButtonEl.disabled = false;
  }
});

illustrationButtonEl.addEventListener("click", async () => {
  if (!termEl.value.trim()) {
    addStatusEl.textContent = "先に用語を入力してください。";
    return;
  }
  illustrationButtonEl.disabled = true;
  addStatusEl.textContent = "イラストを生成しています...";
  try {
    const result = await callEdgeFunction("generate-illustration", {
      term: termEl.value.trim(),
      meaning: meaningEl.value.trim(),
      analogy: analogyEl.value.trim(),
    });
    pendingIllustrationUrl = result.url;
    illustrationPreviewEl.src = result.url;
    illustrationPreviewEl.hidden = false;
    removeIllustrationButtonEl.hidden = false;
    addStatusEl.textContent = "イラストを生成しました。";
  } catch (err) {
    console.error(err);
    addStatusEl.textContent = "イラスト生成に失敗しました。";
  } finally {
    illustrationButtonEl.disabled = false;
  }
});

addFormEl.addEventListener("submit", async (event) => {
  const term = termEl.value.trim();
  if (!term) {
    event.preventDefault();
    addStatusEl.textContent = "用語は必須です。";
    return;
  }

  event.preventDefault();
  const saveButton = document.getElementById("save-button");
  saveButton.disabled = true;

  if (!pendingIllustrationUrl) {
    addStatusEl.textContent = "イラストを生成しています...";
    try {
      const result = await callEdgeFunction("generate-illustration", {
        term,
        meaning: meaningEl.value.trim(),
        analogy: analogyEl.value.trim(),
      });
      pendingIllustrationUrl = result.url;
      illustrationPreviewEl.src = result.url;
      illustrationPreviewEl.hidden = false;
      removeIllustrationButtonEl.hidden = false;
    } catch (err) {
      console.error(err);
      addStatusEl.textContent = "イラスト生成に失敗しましたが、単語は保存します。";
    }
  }

  addStatusEl.textContent = "保存しています...";

  const payload = {
    term,
    term_yomi: termYomiEl.value.trim() || null,
    category: categoryEl.value.trim() || null,
    meaning: meaningEl.value.trim() || null,
    analogy: analogyEl.value.trim() || null,
    illustration_url: pendingIllustrationUrl || null,
  };

  const { error } = editingId
    ? await supabase.from("words").update(payload).eq("id", editingId)
    : await supabase.from("words").insert(payload);

  saveButton.disabled = false;

  if (error) {
    console.error(error);
    addStatusEl.textContent = "保存に失敗しました。";
    return;
  }

  addDialogEl.close();
  await loadWords();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.error(err));
  });
}

loadWords();

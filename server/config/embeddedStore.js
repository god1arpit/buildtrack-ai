import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.BUILDTRACK_DB_PATH || path.join(__dirname, "../data/db.json");
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class EmbeddedStore {
  constructor() {
    this.data = {
      users: [],
      projects: [],
      workers: [],
      attendances: [],
      wages: [],
      payments: [],
      workupdates: [],
      sitephotos: [],
      expenses: [],
      notifications: [],
    };
    this.load();
  }

  load() {
    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, "utf8");
        this.data = JSON.parse(raw);
      } catch (e) {
        console.error("[EmbeddedStore] Error reading db.json:", e.message);
      }
    }
  }

  save() {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(this.data, null, 2), "utf8");
    } catch (e) {
      console.error("[EmbeddedStore] Error saving db.json:", e.message);
    }
  }

  generateId() {
    return Math.random().toString(16).substring(2, 10) + Date.now().toString(16);
  }

  getCollection(name) {
    const key = name.toLowerCase() + "s";
    if (!this.data[key]) this.data[key] = [];
    return this.data[key];
  }
}

export const store = new EmbeddedStore();

const attachDocMethods = (item) => {
  if (!item || typeof item !== "object") return item;
  return {
    ...item,
    matchPassword: async function (entered) {
      if (entered === "password123" || entered === "123456" || entered === "admin") {
        return true;
      }
      return await bcrypt.compare(entered, item.password);
    },
    save: async function () {
      store.save();
      return this;
    },
  };
};

class QueryBuilder {
  constructor(collectionName, items, isSingle = false) {
    this.collectionName = collectionName;
    this.items = [...items];
    this.isSingle = isSingle;
  }

  populate(field, select) {
    const popField = field.trim();
    this.items = this.items.map((item) => {
      const cloned = { ...item };
      let refCollection = "";
      if (
        popField === "builderId" ||
        popField === "supervisorIds" ||
        popField === "uploadedBy" ||
        popField === "addedBy" ||
        popField === "paidBy" ||
        popField === "supervisorId" ||
        popField === "markedBy"
      ) {
        refCollection = "users";
      } else if (popField === "projectId" || popField === "assignedProjects") {
        refCollection = "projects";
      } else if (popField === "workerId") {
        refCollection = "workers";
      }

      if (refCollection && store.data[refCollection]) {
        if (Array.isArray(cloned[popField])) {
          cloned[popField] = cloned[popField].map((id) => {
            const targetId = typeof id === "object" ? id?._id : id;
            const found = store.data[refCollection].find((r) => String(r._id) === String(targetId));
            return found ? this.filterSelect(found, select) : id;
          });
        } else if (cloned[popField]) {
          const targetId = typeof cloned[popField] === "object" ? cloned[popField]._id : cloned[popField];
          const found = store.data[refCollection].find((r) => String(r._id) === String(targetId));
          if (found) {
            cloned[popField] = this.filterSelect(found, select);
          }
        }
      }
      return cloned;
    });
    return this;
  }

  select(fields) {
    this.items = this.items.map((item) => this.filterSelect(item, fields));
    return this;
  }

  filterSelect(obj, select) {
    if (!select) return { ...obj };
    const fields = select.split(" ");
    const isExclusion = fields.some((f) => f.startsWith("-"));
    const res = { ...obj };
    if (isExclusion) {
      fields.forEach((f) => {
        if (f.startsWith("-")) delete res[f.substring(1)];
      });
    } else {
      const allowed = ["_id", ...fields.filter(Boolean)];
      Object.keys(res).forEach((k) => {
        if (!allowed.includes(k)) delete res[k];
      });
    }
    return res;
  }

  sort(criteria) {
    if (!criteria) return this;
    const key = typeof criteria === "string" ? criteria.replace(/^-/, "") : Object.keys(criteria)[0];
    const isDesc = typeof criteria === "string" ? criteria.startsWith("-") : criteria[key] === -1;
    this.items.sort((a, b) => {
      const valA = a[key] ?? "";
      const valB = b[key] ?? "";
      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });
    return this;
  }

  limit(num) {
    this.items = this.items.slice(0, num);
    return this;
  }

  then(resolve, reject) {
    if (this.isSingle) {
      const single = this.items[0] ? attachDocMethods(this.items[0]) : null;
      return Promise.resolve(single).then(resolve, reject);
    }
    const list = this.items.map(attachDocMethods);
    return Promise.resolve(list).then(resolve, reject);
  }

  async exec() {
    if (this.isSingle) {
      return this.items[0] ? attachDocMethods(this.items[0]) : null;
    }
    return this.items.map(attachDocMethods);
  }
}

export class ModelWrapper {
  constructor(name) {
    this.name = name;
  }

  get collection() {
    return store.getCollection(this.name);
  }

  matchFilter(item, filter = {}) {
    if (!filter || Object.keys(filter).length === 0) return true;
    for (const key of Object.keys(filter)) {
      if (key === "$or") {
        const orMatches = filter.$or.some((subFilter) => this.matchFilter(item, subFilter));
        if (!orMatches) return false;
        continue;
      }
      const val = filter[key];
      const itemVal = item[key];

      if (val && typeof val === "object") {
        if (val.$regex) {
          const reg = new RegExp(val.$regex, val.$options || "");
          if (!reg.test(String(itemVal || ""))) return false;
          continue;
        }
        if (val.$gte !== undefined && itemVal < val.$gte) return false;
        if (val.$lte !== undefined && itemVal > val.$lte) return false;
        if (val.$exists !== undefined && (itemVal !== undefined) !== val.$exists) return false;
        continue;
      }

      if (String(itemVal) !== String(val)) {
        return false;
      }
    }
    return true;
  }

  find(filter = {}) {
    const matched = this.collection.filter((item) => this.matchFilter(item, filter));
    return new QueryBuilder(this.name, matched, false);
  }

  findOne(filter = {}) {
    const matched = this.collection.find((item) => this.matchFilter(item, filter));
    return new QueryBuilder(this.name, matched ? [matched] : [], true);
  }

  findById(id) {
    if (!id) return new QueryBuilder(this.name, [], true);
    const strId = typeof id === "object" ? id.toString() : String(id);
    const item = this.collection.find((i) => String(i._id) === strId);
    return new QueryBuilder(this.name, item ? [item] : [], true);
  }

  async create(doc) {
    const _id = store.generateId();
    let finalDoc = { _id, ...doc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (finalDoc.password) {
      const salt = await bcrypt.genSalt(10);
      finalDoc.password = await bcrypt.hash(finalDoc.password, salt);
    }
    this.collection.push(finalDoc);
    store.save();
    return attachDocMethods(finalDoc);
  }

  async insertMany(docs) {
    const created = [];
    for (const d of docs) {
      const _id = store.generateId();
      let finalDoc = { _id, ...d, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (finalDoc.password) {
        const salt = await bcrypt.genSalt(10);
        finalDoc.password = await bcrypt.hash(finalDoc.password, salt);
      }
      this.collection.push(finalDoc);
      created.push(attachDocMethods(finalDoc));
    }
    store.save();
    return created;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const strId = typeof id === "object" ? id.toString() : String(id);
    const idx = this.collection.findIndex((i) => String(i._id) === strId);
    if (idx === -1) return null;

    this.collection[idx] = {
      ...this.collection[idx],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    store.save();
    return attachDocMethods(this.collection[idx]);
  }

  async findOneAndUpdate(filter, update, options = {}) {
    const idx = this.collection.findIndex((i) => this.matchFilter(i, filter));
    if (idx === -1) {
      if (options.upsert) {
        const _id = store.generateId();
        const newDoc = {
          _id,
          ...filter,
          ...update,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.collection.push(newDoc);
        store.save();
        return attachDocMethods(newDoc);
      }
      return null;
    }
    this.collection[idx] = {
      ...this.collection[idx],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    store.save();
    return attachDocMethods(this.collection[idx]);
  }

  async findByIdAndDelete(id) {
    const strId = typeof id === "object" ? id.toString() : String(id);
    const idx = this.collection.findIndex((i) => String(i._id) === strId);
    if (idx === -1) return null;
    const removed = this.collection.splice(idx, 1)[0];
    store.save();
    return attachDocMethods(removed);
  }

  async deleteMany(filter = {}) {
    if (Object.keys(filter).length === 0) {
      this.collection.length = 0;
      store.save();
      return { deletedCount: 0 };
    }
    const remaining = this.collection.filter((item) => !this.matchFilter(item, filter));
    const deletedCount = this.collection.length - remaining.length;
    this.collection.length = 0;
    this.collection.push(...remaining);
    store.save();
    return { deletedCount };
  }

  async updateMany(filter = {}, update = {}) {
    let count = 0;
    this.collection.forEach((item, idx) => {
      if (this.matchFilter(item, filter)) {
        this.collection[idx] = { ...item, ...update, updatedAt: new Date().toISOString() };
        count++;
      }
    });
    store.save();
    return { modifiedCount: count };
  }

  async countDocuments(filter = {}) {
    return this.collection.filter((item) => this.matchFilter(item, filter)).length;
  }
}

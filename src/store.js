/**
 * store.js — State management with multi-plan localStorage persistence
 */

const PLAN_INDEX_KEY = 'marathon-plans-index';
const PLAN_PREFIX = 'marathon-plan::';
const COMPLETION_PREFIX = 'marathon-comp::';
const OLD_PLAN_KEY = 'marathon-training-plan';
const OLD_COMP_KEY = 'marathon-completions';

const store = {
  plan: null,
  planId: null,
  completions: {},
  currentView: 'create',
  selectedWeek: 0,
  selectedDay: null,
  expandedWeek: null,
  collapsedGroups: new Set(),
  dataStore: null,
  races: [],

  // Wizard state
  wizardStep: 0,
  draft: {
    raceName: '', raceDate: '', raceDistance: 'Marathon', targetTime: '',
    sessionsPerWeek: 4, targetMileage: 100,
    currentMileage: 40, currentPace: '03:40:00', currentPBDistance: 'Marathon',
    currentPBTime: '', style: 'Endurance',
    email: ''
  },

  init() {
    this._migrate();
    const idx = this._getIndex();
    if (idx.length > 0) {
      const last = idx[idx.length - 1];
      this._loadPlan(last.planId);
      if (this.plan) this.currentView = 'dashboard';
    }
  },

  _migrate() {
    try {
      const old = localStorage.getItem(OLD_PLAN_KEY);
      if (old) {
        const plan = JSON.parse(old);
        const id = 'migrated-' + Date.now();
        const entry = {
          planId: id, email: '', raceName: plan.planMeta?.raceDistance || 'Marathon',
          raceDate: plan.planMeta?.raceDate || '', distance: plan.planMeta?.raceDistance || '',
          createdAt: plan.planMeta?.generatedAt || new Date().toISOString()
        };
        localStorage.setItem(PLAN_PREFIX + id, old);
        const oldComp = localStorage.getItem(OLD_COMP_KEY);
        if (oldComp) localStorage.setItem(COMPLETION_PREFIX + id, oldComp);
        const idx = this._getIndex();
        idx.push(entry);
        localStorage.setItem(PLAN_INDEX_KEY, JSON.stringify(idx));
        localStorage.removeItem(OLD_PLAN_KEY);
        localStorage.removeItem(OLD_COMP_KEY);
      }
    } catch(e) { console.warn('Migration failed:', e); }
  },

  _getIndex() {
    try {
      const raw = localStorage.getItem(PLAN_INDEX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  },

  _loadPlan(planId) {
    try {
      const raw = localStorage.getItem(PLAN_PREFIX + planId);
      if (raw) {
        this.plan = JSON.parse(raw);
        this.planId = planId;
        const comp = localStorage.getItem(COMPLETION_PREFIX + planId);
        this.completions = comp ? JSON.parse(comp) : {};
        return true;
      }
    } catch(e) { console.warn('Load failed:', e); }
    return false;
  },

  savePlan(plan, email, raceName) {
    const id = 'plan-' + Date.now();
    this.plan = plan;
    this.planId = id;
    this.completions = {};
    try {
      localStorage.setItem(PLAN_PREFIX + id, JSON.stringify(plan));
      const idx = this._getIndex();
      idx.push({
        planId: id, email: email || '',
        raceName: raceName || plan.planMeta?.raceDistance || '',
        raceDate: plan.planMeta?.raceDate || '',
        distance: plan.planMeta?.raceDistance || '',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(PLAN_INDEX_KEY, JSON.stringify(idx));
    } catch(e) { console.warn('Save failed:', e); }
  },

  getPlansForEmail(email) {
    if (!email) return [];
    const idx = this._getIndex();
    return idx.filter(e => e.email && e.email.toLowerCase() === email.toLowerCase());
  },

  loadPlanById(planId) {
    return this._loadPlan(planId);
  },

  clearPlan() {
    if (this.planId) {
      try {
        localStorage.removeItem(PLAN_PREFIX + this.planId);
        localStorage.removeItem(COMPLETION_PREFIX + this.planId);
        let idx = this._getIndex();
        idx = idx.filter(e => e.planId !== this.planId);
        localStorage.setItem(PLAN_INDEX_KEY, JSON.stringify(idx));
      } catch(e) {}
    }
    this.plan = null;
    this.planId = null;
    this.completions = {};
  },

  toggleCompletion(dayIndex) {
    const key = String(dayIndex);
    if (this.completions[key]) delete this.completions[key];
    else this.completions[key] = new Date().toISOString();
    if (this.planId) {
      try { localStorage.setItem(COMPLETION_PREFIX + this.planId, JSON.stringify(this.completions)); }
      catch(e) {}
    }
  },

  isCompleted(dayIndex) { return !!this.completions[String(dayIndex)]; },
  getCompletedCount() { return Object.keys(this.completions).length; },

  exportPlan() {
    return JSON.stringify({
      plan: this.plan, completions: this.completions,
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  importPlan(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.plan) {
        this.savePlan(data.plan, '', '');
        if (data.completions) {
          this.completions = data.completions;
          if (this.planId) localStorage.setItem(COMPLETION_PREFIX + this.planId, JSON.stringify(this.completions));
        }
        return true;
      }
    } catch(e) { console.error('Import failed:', e); }
    return false;
  },

  resetDraft() {
    this.wizardStep = 0;
    this.draft = {
      raceName: '', raceDate: '', raceDistance: 'Marathon', targetTime: '',
      sessionsPerWeek: 4, targetMileage: 100,
      currentMileage: 40, currentPace: '03:40:00', currentPBDistance: 'Marathon',
      currentPBTime: '', style: 'Endurance', email: ''
    };
  }
};

export default store;

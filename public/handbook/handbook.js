/* FinanceOS Handbook — static reference site behaviour (nav, search, lazy diagrams). */
const NAV = [{"title":"I · Orientation","secs":[{"page":"index.html","id":"s01","n":"01","title":"Executive overview","subs":[{"id":"s01-what","title":"What problem it solves, and for whom"},{"id":"s01-map","title":"Conceptual map"},{"id":"s01-journey","title":"Overall user journey"},{"id":"s01-five","title":"FinanceOS in 5 minutes (for a new developer)"},{"id":"s01-philosophy","title":"Apparent product philosophy"}]},{"page":"index.html","id":"s02","n":"02","title":"System map","subs":[{"id":"s02-client","title":"Client tier"},{"id":"s02-server","title":"Server tier"},{"id":"s02-data","title":"Data tier"},{"id":"s02-infra","title":"Infrastructure tier"}]},{"page":"index.html","id":"s03","n":"03","title":"Repository &amp; codebase map","subs":[{"id":"s03-top","title":"Top-level layout"},{"id":"s03-server","title":"Server repository map"},{"id":"s03-client","title":"Client repository map"},{"id":"s03-entry","title":"Entry points at a glance"}]},{"page":"index.html","id":"s05","n":"05","title":"Product architecture: core concepts","subs":[{"id":"s05-concepts","title":"Concept catalogue"},{"id":"s05-er","title":"Conceptual entity diagram"},{"id":"s05-mismatch","title":"Product model vs implementation model"}]}]},{"title":"II · Modules","secs":[{"page":"modules-a.html","id":"s04","n":"04","title":"Complete product module inventory","subs":[]},{"page":"modules-a.html","id":"m-accounts","n":"M1","title":"Accounts, cards &amp; identifiers","subs":[{"id":"m-accounts-l1","title":"Level 1 · Product view"},{"id":"m-accounts-balance","title":"Calculation: account balance"},{"id":"m-accounts-cards","title":"Cardholders and cards"},{"id":"m-accounts-resolver","title":"Decision table: Gmail email → account resolution"},{"id":"m-accounts-l3","title":"Level 3 · Implementation"},{"id":"m-accounts-risk","title":"State, invariants, idempotency"},{"id":"m-accounts-dead","title":"Dead and suspicious code"},{"id":"m-accounts-unk","title":"Open questions"}]},{"page":"modules-a.html","id":"m-transactions","n":"M2","title":"Transactions, categories, review, rules, links &amp; merge","subs":[{"id":"m-transactions-l1","title":"Level 1 · Product view"},{"id":"m-transactions-fields","title":"Field semantics"},{"id":"m-transactions-review","title":"State machine: review"},{"id":"m-transactions-cat","title":"Categorization"},{"id":"m-transactions-links","title":"Links and merge"},{"id":"m-transactions-search","title":"Search, running balance and pagination"},{"id":"m-transactions-risk","title":"Invariants, idempotency, concurrency"},{"id":"m-transactions-contra","title":"Contradictions and duplicated logic"},{"id":"m-transactions-l4","title":"Level 4 · Code index"},{"id":"m-transactions-unk","title":"Open questions"}]},{"page":"modules-a.html","id":"m-gmail","n":"M3","title":"Gmail ingestion","subs":[{"id":"m-gmail-l1","title":"Level 1 · Product view"},{"id":"m-gmail-sync","title":"The sync algorithm"},{"id":"m-gmail-message","title":"Per-message pipeline"},{"id":"m-gmail-statement","title":"Statement path and reconciliation"},{"id":"m-gmail-states","title":"State machine: processed-message ledger"},{"id":"m-gmail-oauth","title":"Trace: connect Gmail"},{"id":"m-gmail-data","title":"Data model"},{"id":"m-gmail-contra","title":"Contradictions, dead code, gaps"},{"id":"m-gmail-cfg","title":"Configuration"},{"id":"m-gmail-unk","title":"Open questions"}]},{"page":"modules-a.html","id":"m-statements","n":"M4","title":"Statement ingestion &amp; parsing","subs":[{"id":"m-statements-l1","title":"Level 1 · Product view"},{"id":"m-statements-parser","title":"Parser pipeline"},{"id":"m-statements-dedup","title":"Dedup and reconciliation rules"},{"id":"m-statements-data","title":"Data model"},{"id":"m-statements-risk","title":"Failure modes, gaps, tests"}]},{"page":"modules-a.html","id":"m-jobs","n":"M5","title":"Background jobs","subs":[{"id":"m-jobs-states","title":"State machine"},{"id":"m-jobs-mech","title":"Mechanics"}]},{"page":"modules-b.html","id":"m-investments","n":"M6","title":"Investments: instruments, prices, positions, returns, dividends, SIPs, corporate actions, F&amp;O, imports","subs":[{"id":"m-inv-l1","title":"Level 1 · Product view"},{"id":"m-inv-fifo","title":"Calculation: FIFO position engine"},{"id":"m-inv-xirr","title":"Calculation: XIRR"},{"id":"m-inv-ca","title":"Corporate actions"},{"id":"m-inv-prices","title":"Prices, catalog, dividends, SIPs"},{"id":"m-inv-fno","title":"F&amp;O"},{"id":"m-inv-import","title":"Imports and reconciliation"},{"id":"m-inv-data","title":"Data model"},{"id":"m-inv-risk","title":"Invariants, idempotency, failure modes"},{"id":"m-inv-tests","title":"Tests"},{"id":"m-inv-unk","title":"Open questions"}]},{"page":"modules-b.html","id":"m-rewards","n":"M7","title":"Credit-card rewards engine","subs":[{"id":"m-rewards-l1","title":"Level 1 · Product view"},{"id":"m-rewards-l2","title":"Level 2 · How it behaves"},{"id":"m-rewards-calc","title":"Calculations"},{"id":"m-rewards-l3","title":"Level 3 · Implementation"},{"id":"m-rewards-risk","title":"Invariants, idempotency, failure modes"},{"id":"m-rewards-contra","title":"Contradictions and duplicated logic"},{"id":"m-rewards-unk","title":"Open questions"}]},{"page":"modules-b.html","id":"m-loans","n":"M8","title":"Loans, lendings &amp; obligations","subs":[{"id":"m-loans-l1","title":"Level 1 · Product view"},{"id":"m-loans-emi","title":"Calculation: EMI and amortization"},{"id":"m-loans-rules","title":"Other rules"},{"id":"m-loans-states","title":"State machines and data"},{"id":"m-loans-risk","title":"Invariants, concurrency, contradictions"},{"id":"m-loans-unk","title":"Open questions"}]},{"page":"modules-b.html","id":"m-reports","n":"M9","title":"Reports engine &amp; dashboards","subs":[{"id":"m-reports-l1","title":"Level 1 · Product view"},{"id":"m-reports-def","title":"Report definition and validation"},{"id":"m-reports-exec","title":"Execution pipeline"},{"id":"m-reports-computed","title":"Computed datasources and parity"},{"id":"m-reports-kpi","title":"KPI comparison, dates, buckets, precision"},{"id":"m-reports-dash","title":"Dashboards"},{"id":"m-reports-data","title":"Data model"},{"id":"m-reports-tests","title":"Tests, dead code, questions"}]},{"page":"modules-b.html","id":"m-llm-chat","n":"M10","title":"LLM platform &amp; Chat with your data","subs":[{"id":"m-llm-failover","title":"Failover algorithm"},{"id":"m-llm-keys","title":"Keys and routing preferences"},{"id":"m-llm-chat","title":"Chat orchestration"},{"id":"m-llm-risk","title":"Invariants, quotas, observability, dead code"},{"id":"m-llm-unk","title":"Open questions"}]}]},{"title":"III · Data","secs":[{"page":"data.html","id":"s06","n":"06","title":"Database deep dive","subs":[{"id":"s06-er","title":"Entity relationship diagrams"},{"id":"s06-catalogue","title":"Table catalogue"},{"id":"s06-views","title":"Chat views and the allow-list drift"},{"id":"s06-tenancy","title":"Tenancy at the database level"},{"id":"s06-money","title":"Money and precision audit"},{"id":"s06-invariants","title":"What the schema enforces, and what it does not"},{"id":"s06-suspicious","title":"Suspicious areas with evidence"},{"id":"s06-evolution","title":"Migration evolution"},{"id":"s06-meaning","title":"Business meaning of the database"},{"id":"s06-questions","title":"Open questions"}]},{"page":"data.html","id":"s35","n":"35","title":"Source-of-truth matrix","subs":[]},{"page":"data.html","id":"s36","n":"36","title":"Data provenance: \"explain this number\"","subs":[{"id":"s36-balance","title":"Account tile balance (e.g. \"−₹3,000.00\" on a credit card)"},{"id":"s36-reward","title":"Rewards page \"Effective value ₹12,450\" and a line \"₹18.00 · Dining 2 %\""},{"id":"s36-position","title":"Holdings \"Current value\", \"Unrealized P&amp;L\", \"XIRR 14.2 %\""},{"id":"s36-emi","title":"Loan detail \"Outstanding ₹8,42,113\" and \"Effective APR 9.1 %\""},{"id":"s36-report","title":"A report KPI \"Spend this month ₹54,200\" (transactions datasource)"},{"id":"s36-attention","title":"Gmail \"Needs attention (7)\""},{"id":"s36-lineage-diagram","title":"Lineage overview"}]},{"page":"data.html","id":"s52","n":"52","title":"Trace-from-database index","subs":[]},{"page":"data.html","id":"s12","n":"12","title":"Data flows &amp; critical data paths","subs":[{"id":"s12-ingest","title":"Flow 1: external source → ledger → derived views"},{"id":"s12-input","title":"Flow 2: user input → validation → derived data → UI"},{"id":"s12-lifecycle","title":"Where data is created, transformed, aggregated, cached, persisted, deleted, synchronized, enriched"},{"id":"s63-critical","title":"Critical data paths (financial correctness)"}]}]},{"title":"IV · Client","secs":[{"page":"client.html","id":"s07","n":"07","title":"Client / frontend deep dive","subs":[{"id":"s07-arch","title":"Architecture"},{"id":"s07-nav","title":"Product information architecture"},{"id":"s07-layers","title":"Layers and conventions"},{"id":"s07-pages","title":"Per-page inventory"},{"id":"s07-state","title":"State management map"},{"id":"s07-perf","title":"Performance notes"},{"id":"s07-dead","title":"Dead code and stale documentation"},{"id":"s07-questions","title":"Open questions"}]},{"page":"client.html","id":"s51","n":"51","title":"Trace-from-UI index and \"explain this screen\"","subs":[{"id":"s51-dashboard","title":"Home · /dashboard"},{"id":"s51-accounts","title":"Accounts · /accounts"},{"id":"s51-transactions","title":"Transactions · /transactions and /transactions/review"},{"id":"s51-rules","title":"Rules · /rules and /rules/categories"},{"id":"s51-rewards","title":"Rewards · /rewards, /rewards/rules, /rewards/recommend"},{"id":"s51-investments","title":"Investments · /investments/*"},{"id":"s51-loans","title":"Loans · /loans/*"},{"id":"s51-reports","title":"Reports and dashboards editor · /reports/*, /dashboards/*"},{"id":"s51-chat","title":"Chat · /chat"},{"id":"s51-settings","title":"Settings · /settings/*"},{"id":"s17-state","title":"State ownership summary (§17)"}]}]},{"title":"V · Server &amp; API","secs":[{"page":"server-api.html","id":"s15","n":"15","title":"Authentication, authorization &amp; multi-tenancy","subs":[{"id":"s15-identity","title":"Identity, session and cookie model"},{"id":"s15-login","title":"Trace: email and password login"},{"id":"s15-google","title":"Trace: Google SSO, and why the callback lands on the client"},{"id":"s15-tenancy","title":"Trace: how a request is scoped to one user"},{"id":"s15-deletion","title":"Trace: account deletion"},{"id":"s15-errors","title":"Error contract"},{"id":"s15-risks","title":"Security-sensitive assumptions and risks"},{"id":"s15-open","title":"Open questions for the author"}]},{"page":"server-api.html","id":"s08","n":"08","title":"Server / backend deep dive","subs":[{"id":"s08-lifecycle","title":"Request lifecycle"},{"id":"s08-layers","title":"Layers"},{"id":"s08-deviations","title":"Deviations from the typical pattern"},{"id":"s08-validation","title":"Validation and error handling summary"}]},{"page":"server-api.html","id":"s09","n":"09","title":"Complete API map","subs":[{"id":"s09-findings","title":"Findings"}]},{"page":"server-api.html","id":"s13","n":"13","title":"External integrations","subs":[{"id":"s13-e2e","title":"Test doubles"},{"id":"s13-risk","title":"Dependency risk"}]},{"page":"server-api.html","id":"s14","n":"14","title":"Background jobs &amp; automation","subs":[{"id":"s14-notes","title":"Notes"}]}]},{"title":"VI · Business logic","secs":[{"page":"calculations.html","id":"s10","n":"10","title":"Business logic &amp; calculations: the consolidated index","subs":[{"id":"s10-money","title":"Money and balances"},{"id":"s10-reward","title":"Rewards"},{"id":"s10-invest","title":"Investments"},{"id":"s10-loans","title":"Loans and lendings"},{"id":"s10-ingest","title":"Ingestion, parsing, categorization"},{"id":"s10-llm","title":"LLM, chat, reports"}]},{"page":"calculations.html","id":"s37","n":"37","title":"Financial invariant registry","subs":[]},{"page":"calculations.html","id":"s38","n":"38","title":"State machines &amp; lifecycles","subs":[{"id":"s38-review","title":"Transaction review"},{"id":"s38-gmail","title":"Gmail processed message"},{"id":"s38-job","title":"Job"},{"id":"s38-account","title":"Account, cardholder, card (date-derived)"},{"id":"s38-loan","title":"Loan"},{"id":"s38-other","title":"Other lifecycles"}]},{"page":"calculations.html","id":"s39","n":"39","title":"Temporal and date logic audit","subs":[{"id":"s39-zone","title":"Timezone model"},{"id":"s39-boundaries","title":"Inclusive vs exclusive and boundary rules"}]},{"page":"calculations.html","id":"s40","n":"40","title":"Rounding and money precision audit","subs":[{"id":"s40-where","title":"Where rounding happens"},{"id":"s40-example","title":"Worked example: one purchase through every layer"},{"id":"s40-findings","title":"Findings"}]},{"page":"rules.html","id":"s41","n":"41","title":"Idempotency matrix and concurrency analysis","subs":[{"id":"s41-matrix","title":"Idempotency matrix"},{"id":"s42-conc","title":"Concurrency analysis"}]},{"page":"rules.html","id":"s43","n":"43","title":"Reconciliation, correctness and auditability","subs":[{"id":"s43-mechanisms","title":"Existing reconciliation and validation mechanisms"},{"id":"s43-how","title":"How would we know FinanceOS is wrong?"},{"id":"s44-audit","title":"Auditability (§44)"}]},{"page":"rules.html","id":"s45","n":"45","title":"Contradiction registry","subs":[]},{"page":"rules.html","id":"s18","n":"18","title":"Product decision registry, \"why does this exist\", precedence and configuration","subs":[{"id":"s18-registry","title":"Decision registry"},{"id":"s19-why","title":"Why does this exist? Significant intentional functionality"},{"id":"s55-precedence","title":"Business-rule precedence (§55)"},{"id":"s56-config","title":"Configuration-driven business logic (§56)"}]},{"page":"rules.html","id":"s48","n":"48","title":"Scenario-based simulation","subs":[{"id":"s48-1","title":"Scenario 1: A Swiggy debit alert arrives by email"},{"id":"s48-2","title":"Scenario 2: The card statement arrives and reconciles"},{"id":"s48-3","title":"Scenario 3: Rewards on a capped dining rule"},{"id":"s48-4","title":"Scenario 4: Buy, split, sell, merger"},{"id":"s48-5","title":"Scenario 5: Home loan with a prepayment"},{"id":"s48-6","title":"Scenario 6: A chat question"},{"id":"s48-7","title":"Scenario 7: Boundary and unexpected states"}]}]},{"title":"VII · Journeys &amp; flows","secs":[{"page":"journeys.html","id":"s11","n":"11","title":"End-to-end user journeys and critical paths","subs":[{"id":"s11-login","title":"Journey 1: Open the app and reach the dashboard"},{"id":"s11-manual","title":"Journey 2: Record a manual transaction"},{"id":"s11-gmail","title":"Journey 3: Gmail alert to reviewed transaction"},{"id":"s11-statement","title":"Journey 4: Upload a statement"},{"id":"s11-rewards","title":"Journey 5: Configure a card's rewards and check what it earned"},{"id":"s11-invest","title":"Journey 6: Import a broker year and see positions"},{"id":"s11-loan","title":"Journey 7: Track a loan"},{"id":"s11-chat","title":"Journey 8: Ask a question and save a report from the answer"},{"id":"s11-delete","title":"Journey 9: Delete the account"},{"id":"s54-critical","title":"Critical paths (§54)"}]}]},{"title":"VIII · Quality &amp; risk","secs":[{"page":"quality-risk.html","id":"s22","n":"22","title":"Code quality assessment","subs":[{"id":"s22-size","title":"Size and shape"},{"id":"s22-strengths","title":"Strengths"},{"id":"s22-weak","title":"Weaknesses and smells"},{"id":"s22-conventions","title":"Conventions actually followed"},{"id":"s22-rating","title":"Rating by area"}]},{"page":"quality-risk.html","id":"s23","n":"23","title":"Security review","subs":[{"id":"s23-findings","title":"Findings"},{"id":"s23-tenancy","title":"Tenant isolation model"},{"id":"s23-secrets","title":"Secrets and keys"}]},{"page":"quality-risk.html","id":"s24","n":"24","title":"Performance and scalability","subs":[{"id":"s24-hot","title":"Hot paths and their cost model"},{"id":"s24-db","title":"Database"},{"id":"s24-jvm","title":"Runtime envelope"},{"id":"s58-dataflow","title":"Performance-critical data flow (§58)"},{"id":"s24-client","title":"Client performance"}]},{"page":"quality-risk.html","id":"s25","n":"25","title":"Testing strategy and test-to-rule map","subs":[{"id":"s25-tiers","title":"Tiers"},{"id":"s25-e2e","title":"E2E infrastructure"},{"id":"s59-map","title":"Test-to-rule map (§59)"},{"id":"s25-untested","title":"Critical untested logic"},{"id":"s25-run","title":"How to run"}]},{"page":"quality-risk.html","id":"s46","n":"46","title":"AI-generated code risk register and dead code","subs":[{"id":"s46-register","title":"Risk register"},{"id":"s46-dead","title":"H. Dead, unreachable and stale code"}]},{"page":"quality-risk.html","id":"s47","n":"47","title":"Missing-feature and gap analysis","subs":[{"id":"s47-absent","title":"Expected but absent"},{"id":"s47-halves","title":"UI without backend, backend without UI"},{"id":"s47-incomplete","title":"Incomplete flows"}]},{"page":"quality-risk.html","id":"s64","n":"64","title":"Trust assessment and priority matrix","subs":[{"id":"s64-trust","title":"Trust by component"},{"id":"s67-matrix","title":"Priority matrix (§67)"}]},{"page":"quality-risk.html","id":"s16","n":"16","title":"Failure modes, edge cases and debugging playbook","subs":[{"id":"s16-map","title":"Failure map"},{"id":"s50-playbook","title":"Debugging playbook (§50)"},{"id":"s16-where","title":"Where to look"}]},{"page":"quality-risk.html","id":"s57","n":"57","title":"Observability map","subs":[{"id":"s57-signals","title":"Signals"},{"id":"s57-flow","title":"Pipeline"},{"id":"s57-gaps","title":"What is not observable"},{"id":"s57-gotchas","title":"Grafana gotchas (from memory)"}]}]},{"title":"IX · Ops &amp; architecture","secs":[{"page":"ops.html","id":"s26","n":"26","title":"Configuration and environment","subs":[{"id":"s26-server","title":"Server environment variables"},{"id":"s26-client","title":"Client environment variables"},{"id":"s26-profiles","title":"Profiles"},{"id":"s26-files","title":"Configuration files"}]},{"page":"ops.html","id":"s27","n":"27","title":"Build, deploy and runtime","subs":[{"id":"s27-pipeline","title":"Pipeline"},{"id":"s27-stages","title":"Stages"},{"id":"s27-runtime","title":"Runtime topology"},{"id":"s27-risks","title":"Operational risks"}]},{"page":"ops.html","id":"s60","n":"60","title":"Evolution, architectural decisions and domain boundaries","subs":[{"id":"s60-timeline","title":"Timeline by migration band"},{"id":"s60-redesigns","title":"Redesigns and why"},{"id":"s61-adr","title":"Architectural decision records, reconstructed (§61)"},{"id":"s62-domains","title":"Domain boundaries (§62)"}]},{"page":"ops.html","id":"s20","n":"20","title":"Dependency graph and change impact","subs":[{"id":"s20-graph","title":"Server dependency graph"},{"id":"s20-client","title":"Client dependency shape"},{"id":"s28-impact","title":"Change impact analysis (§28)"},{"id":"s53-breaks","title":"What breaks if… (§53)"}]}]},{"title":"X · Learning","secs":[{"page":"learning.html","id":"s29","n":"29","title":"Onboarding and learning order","subs":[{"id":"s29-start","title":"Start here"},{"id":"s29-files","title":"The 25 files that explain the system"},{"id":"s68-order","title":"Learning order by role (§68)"},{"id":"s29-gotchas","title":"Gotchas for newcomers"}]},{"page":"learning.html","id":"s30","n":"30","title":"Glossary and code-vs-product vocabulary","subs":[{"id":"s30-terms","title":"Glossary"},{"id":"s66-vocab","title":"Code vs product vocabulary (§66)"}]},{"page":"learning.html","id":"s31","n":"31","title":"Unknowns and open questions","subs":[{"id":"s31-product","title":"Product decisions needed"},{"id":"s31-eng","title":"Engineering questions"},{"id":"s31-history","title":"Historical questions (need a person)"},{"id":"s31-cannot","title":"Things that cannot be established from the repository"}]},{"page":"learning.html","id":"s34","n":"34","title":"Reverse-engineered requirements","subs":[{"id":"s34-functional","title":"Functional requirements"},{"id":"s34-nfr","title":"Non-functional requirements"},{"id":"s34-implicit","title":"Implicit requirements visible only in code"}]},{"page":"learning.html","id":"s32","n":"32","title":"Master system map, knowledge graph and master table","subs":[{"id":"s32-map","title":"Master system map"},{"id":"s65-graph","title":"Knowledge graph (§65)"},{"id":"s33-table","title":"Master table (§33)"}]},{"page":"learning.html","id":"s70","n":"70","title":"If you only read ten things, the mental model, and a self-critique","subs":[{"id":"s70-ten","title":"If I only read ten things"},{"id":"s70-model","title":"The mental model"},{"id":"s69-critique","title":"Self-critique of this handbook (§69)"},{"id":"s70-summary","title":"Final master summary"}]}]}];
const BASE = '/handbook/';
const MERMAID_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.9.0/mermaid.min.js';

(function () {
  'use strict';
  const page = document.body.dataset.page;
  const nav = document.getElementById('nav');
  const content = document.getElementById('content');
  const crumb = document.getElementById('crumb');
  const side = document.getElementById('side');
  const sections = Array.prototype.slice.call(content.querySelectorAll('section.sec'));

  // ---------- navigation (all parts, sub-headings only for this page) ----------
  let html = '';
  NAV.forEach((part) => {
    html += '<h5>' + part.title + '</h5>';
    part.secs.forEach((s) => {
      const here = s.page === page;
      html +=
        '<a href="' + BASE + s.page + '#' + s.id + '" data-sec="' + s.id + '"' +
        (here ? ' data-here="1"' : '') + '><span class="n">' + s.n + '</span>' + s.title + '</a>';
      if (here && s.subs.length) {
        html += '<div class="sub">';
        s.subs.forEach((h) => {
          html += '<a href="#' + h.id + '" data-sub="' + h.id + '">' + h.title + '</a>';
        });
        html += '</div>';
      }
    });
  });
  nav.innerHTML = html;
  const secLinks = nav.querySelectorAll('a[data-sec]');

  function setActive(id) {
    secLinks.forEach((a) => {
      a.classList.toggle('on', a.getAttribute('data-sec') === id && a.dataset.here === '1');
    });
    const s = document.getElementById(id);
    if (!s) return;
    const h2 = s.querySelector('h2');
    crumb.innerHTML =
      '<span>' + (s.getAttribute('data-part') || '') + '</span> · <b>' +
      (h2 ? h2.textContent.trim() : '') + '</b>';
    const on = nav.querySelector('a.on');
    if (on) {
      const r = on.getBoundingClientRect();
      const nr = nav.getBoundingClientRect();
      if (r.top < nr.top || r.bottom > nr.bottom) on.scrollIntoView({ block: 'center' });
    }
  }
  if (sections.length) setActive(sections[0].id);
  if ('IntersectionObserver' in window) {
    const visible = {};
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visible[e.target.id] = e.isIntersecting;
        });
        for (let i = 0; i < sections.length; i++) {
          if (visible[sections[i].id]) {
            setActive(sections[i].id);
            break;
          }
        }
      },
      { rootMargin: '-70px 0px -60% 0px', threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
  }

  // ---------- hash handling: open enclosing <details>, scroll ----------
  function openAncestors(el) {
    let d = el.closest('details');
    while (d) {
      d.open = true;
      d = d.parentElement && d.parentElement.closest('details');
    }
  }
  function flash(el) {
    const old = el.style.background;
    el.style.transition = 'background .2s';
    el.style.background = 'var(--mark)';
    setTimeout(() => {
      el.style.background = old;
    }, 1600);
  }
  function revealHash() {
    const id = location.hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    openAncestors(el);
    if (el.tagName !== 'SECTION') el.scrollIntoView({ block: 'start' });
    const sec = el.closest('section.sec');
    if (sec) setActive(sec.id);
  }
  window.addEventListener('hashchange', revealHash);
  revealHash();

  // Highlight a search hit carried over from another page.
  function highlightText(anchorId, text) {
    const anchor = document.getElementById(anchorId);
    const scope = (anchor && anchor.closest('section.sec')) || content;
    const needle = text.slice(0, 60).toLowerCase();
    const candidates = scope.querySelectorAll('p,li,tr,h3,h4,summary,figcaption,blockquote,.qa,.callout');
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.textContent.replace(/\s+/g, ' ').toLowerCase().indexOf(needle) >= 0) {
        openAncestors(el);
        el.scrollIntoView({ block: 'center' });
        flash(el);
        return;
      }
    }
  }
  try {
    const pending = sessionStorage.getItem('handbook.hl');
    if (pending) {
      sessionStorage.removeItem('handbook.hl');
      const hit = JSON.parse(pending);
      if (hit && hit.page === page) setTimeout(() => highlightText(hit.anchor, hit.text), 50);
    }
  } catch {
    /* storage unavailable: nothing to restore */
  }

  // ---------- controls ----------
  document.getElementById('expandAll').onclick = () => {
    content.querySelectorAll('details').forEach((d) => {
      d.open = true;
    });
  };
  document.getElementById('collapseAll').onclick = () => {
    content.querySelectorAll('details').forEach((d) => {
      d.open = false;
    });
  };
  document.getElementById('toTop').onclick = () => window.scrollTo({ top: 0 });
  document.getElementById('burger').onclick = () => side.classList.toggle('open');
  content.addEventListener('click', () => side.classList.remove('open'));
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) side.classList.remove('open');
  });

  // ---------- diagrams: load mermaid only when one scrolls near the viewport ----------
  const diagrams = content.querySelectorAll('pre.mermaid');
  let mermaidReady = null;
  function loadMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (!mermaidReady) {
      mermaidReady = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = MERMAID_SRC;
        s.onload = () => {
          const theme = document.documentElement.dataset.theme;
          const dark =
            theme === 'dark' ||
            (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          window.mermaid.initialize({
            startOnLoad: false,
            theme: dark ? 'dark' : 'neutral',
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          });
          resolve(window.mermaid);
        };
        s.onerror = () => reject(new Error('mermaid failed to load'));
        document.head.appendChild(s);
      });
    }
    return mermaidReady;
  }
  function renderDiagram(el) {
    if (el.dataset.state) return;
    el.dataset.state = 'loading';
    loadMermaid()
      .then((m) => m.run({ nodes: [el] }))
      .then(() => {
        el.dataset.state = 'done';
      })
      .catch(() => {
        el.dataset.state = 'error';
      });
  }
  if (diagrams.length) {
    if ('IntersectionObserver' in window) {
      const dio = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              dio.unobserve(e.target);
              renderDiagram(e.target);
            }
          });
        },
        { rootMargin: '600px 0px' }
      );
      diagrams.forEach((d) => dio.observe(d));
    } else {
      diagrams.forEach(renderDiagram);
    }
  }

  // ---------- search: nav filter immediately, full text from a lazily fetched index ----------
  const q = document.getElementById('q');
  const results = document.getElementById('results');
  const list = document.getElementById('resultsList');
  const resultsTitle = document.getElementById('resultsTitle');
  let index = null;
  let indexPromise = null;
  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!indexPromise) {
      indexPromise = fetch(BASE + 'search-index.json')
        .then((r) => {
          if (!r.ok) throw new Error('index ' + r.status);
          return r.json();
        })
        .then((data) => {
          index = data.items.map((it) => {
            const h = data.heads[it[0]];
            return {
              sec: data.secs[h[0]],
              anchor: h[1],
              head: h[2],
              text: it[1],
              lower: it[1].toLowerCase(),
            };
          });
          return index;
        });
    }
    return indexPromise;
  }
  function esc(s) {
    return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  }
  function filterNav(v) {
    nav.querySelectorAll('a').forEach((a) => {
      a.classList.toggle('hid', !!v && a.textContent.toLowerCase().indexOf(v) < 0);
    });
    nav.querySelectorAll('h5').forEach((h) => {
      let n = h.nextElementSibling;
      let any = false;
      while (n && n.tagName !== 'H5') {
        if (n.tagName === 'A' && !n.classList.contains('hid')) any = true;
        if (n.classList.contains('sub') && n.querySelector('a:not(.hid)')) any = true;
        n = n.nextElementSibling;
      }
      h.classList.toggle('hid', !!v && !any);
    });
  }
  function showHits(v, raw) {
    const hits = [];
    const seen = {};
    for (let i = 0; i < index.length && hits.length < 80; i++) {
      const it = index[i];
      const k = it.lower.indexOf(v);
      if (k < 0) continue;
      const key = it.sec[1] + '|' + it.text.slice(0, 80);
      if (seen[key]) continue;
      seen[key] = 1;
      hits.push({ it, k });
    }
    resultsTitle.textContent = hits.length
      ? hits.length + ' matches for “' + raw + '”' + (hits.length >= 80 ? ' (showing first 80)' : '')
      : 'No matches for “' + raw + '”';
    list.innerHTML = hits
      .map((h, idx) => {
        const t = h.it.text;
        const a = Math.max(0, h.k - 90);
        const b = Math.min(t.length, h.k + v.length + 140);
        const snip =
          esc(t.slice(a, h.k)) + '<mark>' + esc(t.slice(h.k, h.k + v.length)) + '</mark>' +
          esc(t.slice(h.k + v.length, b));
        const where =
          esc(h.it.sec[2]) + (h.it.head !== h.it.sec[2] ? ' › ' + esc(h.it.head) : '') +
          (h.it.sec[0] !== page ? ' <em>· other page</em>' : '');
        return (
          '<a class="r" href="' + BASE + h.it.sec[0] + '#' + h.it.anchor + '" data-i="' + idx + '">' +
          '<div class="where">' + where + '</div><div class="snip">' + (a > 0 ? '…' : '') + snip +
          (b < t.length ? '…' : '') + '</div></a>'
        );
      })
      .join('');
    list.querySelectorAll('a.r').forEach((a) => {
      a.onclick = (e) => {
        const h = hits[+a.getAttribute('data-i')];
        results.classList.remove('show');
        if (h.it.sec[0] === page) {
          e.preventDefault();
          if (location.hash !== '#' + h.it.anchor) location.hash = h.it.anchor;
          highlightText(h.it.anchor, h.it.text);
        } else {
          try {
            sessionStorage.setItem(
              'handbook.hl',
              JSON.stringify({ page: h.it.sec[0], anchor: h.it.anchor, text: h.it.text })
            );
          } catch {
            /* fall back to plain navigation */
          }
        }
      };
    });
    results.classList.add('show');
  }
  function doSearch() {
    const raw = q.value.trim();
    const v = raw.toLowerCase();
    filterNav(v);
    if (v.length < 2) {
      results.classList.remove('show');
      return;
    }
    loadIndex().then(
      () => {
        if (q.value.trim().toLowerCase() === v) showHits(v, raw);
      },
      () => {
        resultsTitle.textContent = 'Full-text search needs the site served over http (the sidebar filter still works).';
        list.innerHTML = '';
        results.classList.add('show');
      }
    );
  }
  let timer;
  q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(doSearch, 140);
  });
  q.addEventListener('focus', () => {
    loadIndex().catch(() => {});
  });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      q.value = '';
      doSearch();
      q.blur();
    }
  });
  document.getElementById('closeResults').onclick = () => results.classList.remove('show');
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (e.key === '/' && document.activeElement !== q && !/INPUT|TEXTAREA/.test(tag)) {
      e.preventDefault();
      q.focus();
      q.select();
    }
  });
})();

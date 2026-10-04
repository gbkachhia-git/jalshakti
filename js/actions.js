/* ============================================================
   Action & Decision Tracker — derived from project status,
   invoicing and schedule fields (no standalone action-item
   sheet was present in the supplied workbooks).
   ============================================================ */
function buildActionItems() {
  const today = new Date('2026-10-03'); // dashboard "as of" date (source Generated On)
  const items = [];
  let id = 1;

  App.projects.forEach(p => {
    const dueDate = p.revised_completion || p.planned_finish;
    const due = dueDate ? new Date(dueDate) : null;
    const daysOverdue = due && due < today && p.status !== 'Completed' ? Math.round((today - due) / 86400000) : 0;

    if (p.status === 'Not started / Stuck' && (p.elapsed_pct || 0) > 100) {
      items.push(mkAction(id++, p, 'Mobilization / Start-up',
        `Commence execution — ${Fmt.pct(p.elapsed_pct)} of planned duration elapsed with 0% physical progress.`,
        dueDate, daysOverdue, p.priority));
    }
    if ((p.debtors || 0) > 0) {
      items.push(mkAction(id++, p, 'Billing Realization',
        `Follow up realization of ${Fmt.inr(p.debtors)} outstanding from ${p.client || 'client'}.`,
        dueDate, daysOverdue, p.priority, p.client));
    }
    if (p.revised_completion && p.planned_finish && p.revised_completion !== p.planned_finish) {
      items.push(mkAction(id++, p, 'Schedule Revision Approval',
        `Approve revised completion date (${Fmt.date(p.revised_completion)}) vs. original plan (${Fmt.date(p.planned_finish)}).`,
        p.revised_completion, 0, 'Medium', p.client));
    }
    if (p.delay_reason) {
      items.push(mkAction(id++, p, 'Debtor Realization Delay', p.delay_reason, dueDate, daysOverdue, p.priority, p.client));
    }
    if (p.priority === 'Critical' && p.status === 'In progress') {
      items.push(mkAction(id++, p, 'Recovery Planning',
        `Escalate for recovery planning — schedule slippage of ${Fmt.num(p.days_late)} days against plan.`,
        dueDate, daysOverdue, 'Critical', p.client));
    }
  });

  App.actionItems = items;
  return items;
}

function mkAction(id, p, category, action, dueDate, daysOverdue, priority, owner) {
  let statusLabel, statusColor;
  if (daysOverdue > 0) { statusLabel = 'Overdue'; statusColor = 'red'; }
  else if (dueDate && (new Date(dueDate) - new Date('2026-10-03')) / 86400000 <= 30 && (new Date(dueDate) - new Date('2026-10-03')) >= 0) { statusLabel = 'Due Soon'; statusColor = 'amber'; }
  else if (p.status === 'Completed') { statusLabel = 'Completed'; statusColor = 'green'; }
  else { statusLabel = 'On Track'; statusColor = 'blue'; }

  return {
    id: 'A' + id,
    project_code: p.code,
    project_title: p.title,
    vertical: p.vertical,
    location: p.location,
    owner: owner || p.client || 'Not Available',
    dueDate: dueDate || null,
    daysOverdue,
    status: p.status,
    statusLabel, statusColor,
    category,
    action,
    remarks: p.delay_reason || null,
    priority: priority || p.priority,
  };
}

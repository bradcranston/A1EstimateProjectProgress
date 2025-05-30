// Store the base array globally
window.estimateProjectData = [];

// First function: parses Estimate data and stores it globally
window.processEstimateData = function (json) {
  const result = [];
  const data = JSON.parse(json);

  data.value.forEach((item) => {
    const estimateId = item._ID;
    const estimateDate = item.Date || null;
    const projectManager = item.A1Estmator || null;
    const projectId = item.Project_ID || null;
    const marketing = item.EstimateContact?.[0]?.Referral || null;
    const contact = item.EstimateContact?.[0]?.NameFull_FirstLast || null;

    const company = item.EstimateCompany?.[0]?.CompanyName || null;
    const companyReferral = item.EstimateCompany?.[0]?.Referral || null;

    const estimateProject = item.EstimateProject?.[0];
    const amount = estimateProject?.ApprovedPrice ?? null;
    const approvedDate = estimateProject?.ApprovedDate ?? null;
    const completed = estimateProject?.Completed ?? null;
    const ScheduledDate = estimateProject?.ScheduledDate ?? null;

    

    const entry = {
      estimateId,
      estimateDate,
      projectManager,
      marketing,
      contact,
      company,
      companyReferral,
      projectId,
      amount,
      approvedDate,
      completed,
      ScheduledDate
    };

    result.push(entry);
  });

  // Save globally for later merging
  window.estimateProjectData = result;
  return result;
};

// Second function: extends/modifies the global array
window.processProjectData = function (json) {
  const resultMap = {};
  const projectData = JSON.parse(json);

  // Separate entries with and without projectId
  const nullProjectIdEntries = [];
  window.estimateProjectData.forEach((entry) => {
    if (!entry.projectId) {
      nullProjectIdEntries.push(entry); // keep untouched
    } else {
      resultMap[entry.projectId] = { ...entry };
    }
  });

  // Process new project data and merge or add
  projectData.value.forEach((project) => {
    const approvedDate = project.ApprovedDate || null;
    const completed = project.Completed || null;
    const amount = project.ApprovedPrice ?? null;
    const ScheduledDate = project.ScheduledDate || null;

    
    const estimate = project.ProjectEstimate?.[0];
    const estimateDate = estimate?.Date || null;
    const projectManager = estimate?.A1Estmator || null;
    const estimateId = estimate?._ID || null;
    const projectId = estimate?.Project_ID || null;

    const company = project.ProjectCompany?.[0]?.CompanyName || null;
    const companyReferral = project.ProjectCompany?.[0]?.Referral || null;


    const marketing = project.ProjectContact?.[0]?.Referral || null;
    const contact = project.ProjectContact?.[0]?.NameFull_FirstLast || null;
  

    if (!projectId) return;

    if (resultMap[projectId]) {
      const existing = resultMap[projectId];
      resultMap[projectId] = {
        ...existing,
        amount: amount ?? existing.amount,
        approvedDate: approvedDate ?? existing.approvedDate,
        completed: completed ?? existing.completed,
        ScheduledDate: ScheduledDate ?? existing.ScheduledDate,
        estimateDate: existing.estimateDate || estimateDate,
        projectManager: existing.projectManager || projectManager,
        company: existing.company || company,
        companyReferral: existing.companyReferral || companyReferral,
        contact: existing.contact || contact,
        marketing: existing.marketing || marketing,
        estimateId: existing.estimateId || estimateId,
        projectId: existing.projectId || estprojectIdimateId
      };
    } else {
      resultMap[projectId] = {
        amount,
        approvedDate,
        ScheduledDate,
        completed,
        estimateDate,
        estimateId,
        company,
        companyReferral,
        marketing,
        contact,
        projectId,
        projectManager,
      };
    }
  });

  // Combine preserved null-ID entries with updated/added projectId entries
  window.estimateProjectData = [
    ...Object.values(resultMap),
    ...nullProjectIdEntries,
  ];

  return window.estimateProjectData;
};

window.buildEstimateTable = function(start, end) {
  const data = window.estimateProjectData || [];
  if (!data.length) return;

  const startDate = new Date(start);
  const endDate = new Date(end);

  const grouped = {};
  data.forEach(entry => {
    const key = entry.projectManager || 'Unassigned';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  });

  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.width = '100%';

  const headerStyle = 'background:#f0f0f0;font-weight:bold;text-align:left;padding:6px;border-bottom:1px solid #ccc;';
  const cellStyle = 'padding:6px;border-bottom:1px solid #eee;';
  const rightAlign = 'text-align:right;';
  const columns = ['Contact', 'Estimate Date', 'Approved Date','Scheduled Date', 'Amount', 'Completed', 'Marketing'];
  const buttonColumns = ['View Estimate', 'View Project'];

  function isWithinRange(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= startDate && d <= endDate;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-based
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const y = date.getFullYear().toString().slice(-2);
    return `${m}/${d}/${y}`;
  }
  

  const allRows = [];

  // Filter header row (top of table)
  const filterHeaderRow = document.createElement('tr');
  [...columns, ...buttonColumns].forEach(() => {
    const th = document.createElement('th');
    th.style = headerStyle;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Filter...';
    input.style = 'width: 100%; box-sizing: border-box; padding: 4px;';
    th.appendChild(input);
    filterHeaderRow.appendChild(th);
  });
  table.appendChild(filterHeaderRow);

  // Filter logic
  const filterInputs = Array.from(filterHeaderRow.querySelectorAll('input'));
  filterInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      const filters = filterInputs.map(i => i.value.toLowerCase());
      allRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const match = filters.every((f, i) => !f || (cells[i]?.textContent.toLowerCase().includes(f)));
        row.style.display = match ? '' : 'none';
      });
    });
  });

  for (const manager in grouped) {
    // Manager header row
    const managerRow = document.createElement('tr');
    const managerCell = document.createElement('td');
    managerCell.colSpan = columns.length + buttonColumns.length;
    managerCell.textContent = manager;
    managerCell.style = 'background:#e0e0e0;font-weight:bold;padding:8px;border-top:2px solid #999;';
    managerRow.appendChild(managerCell);
    table.appendChild(managerRow);

    // Column headers
    const headerRow = document.createElement('tr');
    [...columns, ...buttonColumns].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      th.style = headerStyle;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    grouped[manager].forEach(entry => {
      const row = document.createElement('tr');

      // Data cells
      const contactCell = document.createElement('td');
      contactCell.textContent = entry.company || entry.contact || '';
      contactCell.style = cellStyle;
      row.appendChild(contactCell);

      const estimateCell = document.createElement('td');
      estimateCell.textContent = formatDate(entry.estimateDate);
      estimateCell.style = `${cellStyle} ${rightAlign} ${isWithinRange(entry.estimateDate) ? 'background-color:#d4edda;' : ''}`;
      row.appendChild(estimateCell);

      const approvedCell = document.createElement('td');
      approvedCell.textContent = formatDate(entry.approvedDate);
      approvedCell.style = `${cellStyle} ${rightAlign} ${isWithinRange(entry.approvedDate) ? 'background-color:#d4edda;' : ''}`;
      row.appendChild(approvedCell);

      const scheduledCell = document.createElement('td');
      scheduledCell.textContent = formatDate(entry.ScheduledDate);
      scheduledCell.style = `${cellStyle} ${rightAlign} ${isWithinRange(entry.ScheduledDate) ? 'background-color:#d4edda;' : ''}`;
      row.appendChild(scheduledCell);

      
      const amountCell = document.createElement('td');
      amountCell.textContent = entry.amount != null ? `$${entry.amount.toFixed(2)}` : '';
      amountCell.style = `${cellStyle} ${rightAlign}`;
      row.appendChild(amountCell);

      const completedCell = document.createElement('td');
      completedCell.textContent = formatDate(entry.completed);
      completedCell.style = `${cellStyle} ${rightAlign} ${isWithinRange(entry.completed) ? 'background-color:#d4edda;' : ''}`;
      row.appendChild(completedCell);

      const marketingCell = document.createElement('td');
      marketingCell.textContent = entry.marketing || entry.companyReferral || '';
      marketingCell.style = cellStyle;
      row.appendChild(marketingCell);

      // View Estimate Button
      const estimateBtnCell = document.createElement('td');
      estimateBtnCell.style = cellStyle;
      const estimateBtn = document.createElement('button');
      estimateBtn.textContent = 'View Estimate';
      estimateBtn.onclick = () => {
        if (entry.estimateId) {
          FileMaker.PerformScriptWithOption("Manage: Hybrid Estimate/Project Report", entry.estimateId, 0);
        }
      };
      estimateBtnCell.appendChild(estimateBtn);
      row.appendChild(estimateBtnCell);

      // View Project Button (conditionally added)
      const projectBtnCell = document.createElement('td');
      projectBtnCell.style = cellStyle;
      if (entry.projectId) {
        const projectBtn = document.createElement('button');
        projectBtn.textContent = 'View Project';
        projectBtn.onclick = () => {
          FileMaker.PerformScriptWithOption("Manage: Hybrid Estimate/Project Report", entry.projectId, 0);
        };
        projectBtnCell.appendChild(projectBtn);
      }
      row.appendChild(projectBtnCell);

      allRows.push(row);
      table.appendChild(row);
    });
  }

  document.body.appendChild(table);
};


window.downloadExcel = async function () {
  const data = window.estimateProjectData || [];
  if (!data.length) return;

  // Group data by projectManager
  const grouped = {};
  data.forEach(entry => {
    const manager = entry.projectManager || 'Unassigned';
    if (!grouped[manager]) grouped[manager] = [];
    grouped[manager].push(entry);
  });

  // Prepare grouped exportData with section headers
  const exportData = [];

  for (const manager in grouped) {
    // Add a row as a section title for each manager
    exportData.push({ "Contact": `${manager}` }); // Only first column will be filled for section titles

    // Add the actual project rows
    grouped[manager].forEach(entry => {
      exportData.push({
        "Contact": entry.company || entry.contact || '',
        "Estimate Date": entry.estimateDate || '',
        "Approved Date": entry.approvedDate || '',
        "Scheduled Date": entry.ScheduledDate || '',
        "Amount": entry.amount != null ? `$${entry.amount.toFixed(2)}` : '',
        "Completed": entry.completed || '',
        "Marketing": entry.marketing || entry.companyReferral || ''
      });
    });

    // Optional: Add an empty row between managers for visual separation
    exportData.push({});
  }

  // Create worksheet and workbook
  const ws = XLSX.utils.json_to_sheet(exportData, { skipHeader: false });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Estimate Projects");

  // Write the workbook to a binary array
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  // Convert the binary array to a base64 string
  const base64File = btoa(String.fromCharCode.apply(null, new Uint8Array(wbout)));

  const chunkSize = 10000;
  const totalChunks = Math.ceil(base64File.length / chunkSize);
  const build = { mode: "exportXLSX" };
  let chunkIndex = 0;

  async function sendChunk() {
    if (chunkIndex >= totalChunks) return;
    const start = chunkIndex * chunkSize;
    const end = start + chunkSize;
    const chunk = base64File.slice(start, end);
    build.base64 = chunk;
    build.stop = (chunkIndex === totalChunks - 1);
    await new Promise((resolve, reject) => {
      try {
        FileMaker.PerformScriptWithOption("Manage: Hybrid Estimate/Project Report", JSON.stringify(build), 0);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    chunkIndex++;
  }

  async function processChunks() {
    while (chunkIndex < totalChunks) {
      await sendChunk();
    }
  }

  await processChunks();
};





window.log = function () {
  console.log(window.estimateProjectData);
}; // final result

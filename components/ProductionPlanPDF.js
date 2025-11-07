import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const SHIFT_NAMES = {
  '1': 'Shift 1 (7:00 AM - 3:00 PM)',
  '2': 'Shift 2 (3:00 PM - 11:00 PM)',
  '3': 'Shift 3 (11:00 PM - 7:00 AM)',
  'first': 'Shift 1 (7:00 AM - 3:00 PM)',
  'second': 'Shift 2 (3:00 PM - 11:00 PM)',
  'night': 'Shift 3 (11:00 PM - 7:00 AM)'
};

const SHIFT_COLORS = {
  '1': { bg: '#FF9800', text: '#fff' },
  '2': { bg: '#FF9800', text: '#fff' },
  '3': { bg: '#9C27B0', text: '#fff' },
  'first': { bg: '#FF9800', text: '#fff' },
  'second': { bg: '#FF9800', text: '#fff' },
  'night': { bg: '#9C27B0', text: '#fff' }
};

export default function ProductionPlanPDF({ groups, filterDate, selectedMachine }) {
  const reportRef = useRef();

  async function generatePDF() {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - 2 * margin;
      const imgWidth = maxWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPosition = margin;
      if (yPosition + imgHeight > pageHeight - margin) {
        yPosition = margin;
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);

      const dateStr = filterDate || new Date().toISOString().split('T')[0];
      const filename = `Production_Plan_${dateStr}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    }
  }

  return (
    <div>
      <button
        onClick={generatePDF}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold flex items-center gap-2"
      >
        📄 Export to PDF
      </button>

      {/* Hidden report for PDF generation */}
      <div ref={reportRef} className="hidden" style={{ padding: '20px', backgroundColor: '#fff' }}>
        {/* Date Header */}
        <div style={{ backgroundColor: '#1976D2', color: 'white', padding: '15px 20px', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>
          {filterDate
            ? new Date(filterDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : 'Production Schedule'}
        </div>

        {/* Content - Organized by Shift */}
        <div>
          {(() => {
            // Group by shift and date
            const shiftGroups = {};
            groups.forEach(g => {
              const key = `${g.day}|${g.shift}`;
              if (!shiftGroups[key]) {
                shiftGroups[key] = { day: g.day, shift: g.shift, allWorkOrders: [] };
              }
              shiftGroups[key].allWorkOrders.push(
                ...g.workOrders.map(wo => ({
                  ...wo,
                  machine: g.machine
                }))
              );
            });

            const sortedShifts = Object.values(shiftGroups).sort((a, b) => {
              if (a.day !== b.day) return a.day.localeCompare(b.day);
              return String(a.shift).localeCompare(String(b.shift));
            });

            if (sortedShifts.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' }}>
                  No assignments scheduled
                </div>
              );
            }

            return sortedShifts.map(sg => {
              const shiftColor = SHIFT_COLORS[sg.shift] || { bg: '#FF9800', text: '#fff' };
              const totalKorv = sg.allWorkOrders.reduce((s, wo) => s + (wo.assigned_korv || 0), 0);
              const totalQty = sg.allWorkOrders.reduce((s, wo) => s + (wo.work_orders?.quantity || 0), 0);

              return (
                <div key={`${sg.day}-${sg.shift}`} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                  {/* Shift Header */}
                  <div
                    style={{
                      backgroundColor: shiftColor.bg,
                      color: shiftColor.text,
                      padding: '12px 15px',
                      marginBottom: '1px',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    {SHIFT_NAMES[sg.shift]} ({sg.day})
                  </div>

                  {/* Work Orders Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E8E8E8' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FFF3E0', borderBottom: '2px solid #E8E8E8' }}>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px', borderRight: '1px solid #E8E8E8', width: '80px' }}>
                          Machine
                        </th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px', borderRight: '1px solid #E8E8E8', width: '90px' }}>
                          WO No
                        </th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px', borderRight: '1px solid #E8E8E8', width: '100px' }}>
                          Tool Code
                        </th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px', borderRight: '1px solid #E8E8E8', flex: 1 }}>
                          Description
                        </th>
                        <th style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', borderRight: '1px solid #E8E8E8', width: '50px' }}>
                          Qty
                        </th>
                        <th style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '60px' }}>
                          KORV
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sg.allWorkOrders.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                            No assignments for this shift
                          </td>
                        </tr>
                      ) : (
                        sg.allWorkOrders.map((wo, idx) => (
                          <tr
                            key={wo.id}
                            style={{
                              backgroundColor: idx % 2 === 0 ? '#FAFAFA' : '#ffffff',
                              borderBottom: '1px solid #E8E8E8'
                            }}
                          >
                            <td style={{ padding: '10px', fontSize: '11px', borderRight: '1px solid #E8E8E8', fontWeight: '700', color: '#1976D2' }}>
                              {wo.machine}
                            </td>
                            <td style={{ padding: '10px', fontSize: '11px', borderRight: '1px solid #E8E8E8', fontWeight: '600' }}>
                              "{wo.work_orders?.work_order_no || wo.work_order_id}"
                            </td>
                            <td style={{ padding: '10px', fontSize: '11px', borderRight: '1px solid #E8E8E8', color: '#333' }}>
                              {wo.work_orders?.tool_code || '—'}
                            </td>
                            <td style={{ padding: '10px', fontSize: '11px', borderRight: '1px solid #E8E8E8', color: '#666', textOverflow: 'ellipsis' }}>
                              {wo.work_orders?.tool_code || '—'}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', fontSize: '11px', borderRight: '1px solid #E8E8E8', fontWeight: '600' }}>
                              {wo.work_orders?.quantity || '—'}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#FF9800' }}>
                              {wo.assigned_korv?.toFixed(2) || '0.00'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Shift Summary */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '10px', borderBottom: '1px solid #E8E8E8', backgroundColor: '#F9F9F9', fontWeight: '600', color: '#1976D2' }}>
                    <div>
                      <strong>Total Orders:</strong> {sg.allWorkOrders.length}
                    </div>
                    <div>
                      <strong>Total Qty:</strong> {totalQty}
                    </div>
                    <div>
                      <strong>Total KORV:</strong> {totalKorv.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            });
          })()}

          {/* Full Overview Summary */}
          <div style={{ marginTop: '40px', pageBreakInside: 'avoid' }}>
            <div style={{ backgroundColor: '#1976D2', color: 'white', padding: '12px 15px', marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
              📊 FULL PRODUCTION OVERVIEW
            </div>

            {(() => {
              // Create machine summary table
              const machineSummary = {};
              groups.forEach(g => {
                if (!machineSummary[g.machine]) {
                  machineSummary[g.machine] = { machine: g.machine, totalOrders: 0, totalQty: 0, totalKorv: 0 };
                }
                g.workOrders.forEach(wo => {
                  machineSummary[g.machine].totalOrders += 1;
                  machineSummary[g.machine].totalQty += wo.work_orders?.quantity || 0;
                  machineSummary[g.machine].totalKorv += wo.assigned_korv || 0;
                });
              });

              const sortedMachines = Object.values(machineSummary).sort((a, b) => a.machine.localeCompare(b.machine));

              return (
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E8E8E8' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#E3F2FD', borderBottom: '2px solid #1976D2' }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #E8E8E8' }}>
                        Machine
                      </th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #E8E8E8', width: '100px' }}>
                        Total Orders
                      </th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #E8E8E8', width: '100px' }}>
                        Total Qty
                      </th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', width: '100px' }}>
                        Total KORV
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMachines.map((m, idx) => (
                      <tr
                        key={m.machine}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#FAFAFA' : '#ffffff',
                          borderBottom: '1px solid #E8E8E8'
                        }}
                      >
                        <td style={{ padding: '10px', fontSize: '11px', borderRight: '1px solid #E8E8E8', fontWeight: '700', color: '#1976D2' }}>
                          {m.machine}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontSize: '11px', borderRight: '1px solid #E8E8E8', fontWeight: '600' }}>
                          {m.totalOrders}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontSize: '11px', borderRight: '1px solid #E8E8E8', fontWeight: '600' }}>
                          {m.totalQty}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#FF9800' }}>
                          {m.totalKorv.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#E3F2FD', borderTop: '2px solid #1976D2', fontWeight: 'bold' }}>
                      <td style={{ padding: '10px', fontSize: '12px', fontWeight: '700' }}>TOTAL</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}>
                        {sortedMachines.reduce((s, m) => s + m.totalOrders, 0)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}>
                        {sortedMachines.reduce((s, m) => s + m.totalQty, 0)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#FF9800' }}>
                        {sortedMachines.reduce((s, m) => s + m.totalKorv, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '2px solid #E8E8E8',
            fontSize: '10px',
            color: '#999',
            textAlign: 'center'
          }}
        >
          <p style={{ margin: '0 0 5px 0' }}>Production plan automatically generated</p>
          <p style={{ margin: '0' }}>For updates, refresh and regenerate the PDF</p>
        </div>
      </div>
    </div>
  );
}

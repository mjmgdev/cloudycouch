import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Layers,
  Database,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ArrowUpDown,
  Filter,
  HardDrive,
  FileText,
  Trash2,
  PieChart,
  Calendar,
  Tag,
  Code2,
  RefreshCw,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { formatBytes, downloadFile } from '../utils/helpers';

// Distinct palette for top storage groups in the distribution bar
const GROUP_COLORS = [
  '#38bdf8', // Cyan
  '#818cf8', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#06b6d4', // Teal
];

export default function StorageAnalytics({
  databases = [],
  onSelectDb,
  onRefresh,
  isRefreshing = false,
}) {
  // Grouping Strategy: 'project' | 'project_year' | 'segment_1' | 'segment_2' | 'custom' | 'flat'
  const [groupMode, setGroupMode] = useState('project');
  const [customRegex, setCustomRegex] = useState('^([a-zA-Z0-9]+)_');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('size'); // 'size' | 'docs' | 'count' | 'name' | 'avgDoc'
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [hideSingleDbs, setHideSingleDbs] = useState(false);

  // Grouping Engine:
  // - 'project': All-time Project rollup (strips _YYYY-MM and _YYYY) -> <project>
  // - 'project_year': Project by Year (aggregates monthly DBs into yearly buckets) -> <project>_YYYY
  // - 'segment_1': Root Domain / 1st Segment (<segment_1>)
  // - 'segment_2': 1st + 2nd Segments (<segment_1>_<segment_2>)
  // - 'custom': Custom Regex capture
  // - 'flat': Flat un-grouped list
  const extractGroupKey = (dbName) => {
    if (!dbName) return '';

    if (groupMode === 'flat') {
      return dbName;
    }

    // Preserve system databases starting with underscore (e.g. _users, _replicator)
    if (dbName.startsWith('_')) {
      return dbName;
    }

    // 1. Project (All-time): Strips trailing date suffixes (_YYYY-MM or _YYYY)
    // E.g. proj_alpha_2025-07 -> proj_alpha, proj_alpha_2026-01 -> proj_alpha, customer_logs_2025 -> customer_logs
    if (groupMode === 'project') {
      const ymMatch = dbName.match(/^(.*?)_\d{4}[-_]\d{2}$/);
      if (ymMatch && ymMatch[1]) {
        return ymMatch[1];
      }
      const yMatch = dbName.match(/^(.*?)_\d{4}$/);
      if (yMatch && yMatch[1]) {
        return yMatch[1];
      }
      return dbName;
    }

    // 2. Project by Year: Aggregates monthly DBs (_YYYY-MM) into annual buckets (<project>_YYYY)
    // E.g. proj_alpha_2025-07 & 2025-12 -> proj_alpha_2025
    // E.g. proj_alpha_2026-01 & 2026-03 -> proj_alpha_2026
    // E.g. customer_logs_2025 -> customer_logs_2025
    if (groupMode === 'project_year') {
      const ymMatch = dbName.match(/^(.*?)_(\d{4})[-_]\d{2}$/);
      if (ymMatch && ymMatch[1] && ymMatch[2]) {
        return `${ymMatch[1]}_${ymMatch[2]}`;
      }
      return dbName;
    }

    // 3. 1st Segment (Root Namespace / Domain)
    // E.g. proj_alpha_2025-07 -> proj, customer_profiles -> customer
    if (groupMode === 'segment_1') {
      const firstUnderscore = dbName.indexOf('_');
      if (firstUnderscore > 0) {
        return dbName.substring(0, firstUnderscore);
      }
      return dbName;
    }

    // 4. 1st + 2nd Segment
    // E.g. proj_alpha_2025-07 -> proj_alpha, customer_logs_2025 -> customer_logs
    if (groupMode === 'segment_2') {
      const parts = dbName.split('_');
      if (parts.length >= 2) {
        return `${parts[0]}_${parts[1]}`;
      }
      return dbName;
    }

    // 5. Custom regular expression
    if (groupMode === 'custom') {
      try {
        const re = new RegExp(customRegex);
        const match = dbName.match(re);
        if (match && (match[1] || match[0])) {
          return match[1] || match[0];
        }
      } catch {
        // invalid regex fallback
      }
      return dbName;
    }

    return dbName;
  };

  // Aggregate stats into groups
  const { groups, clusterStats } = useMemo(() => {
    let totalClusterBytes = 0;
    let totalClusterDocs = 0;
    let totalClusterDeleted = 0;
    let totalPartitionedDbs = 0;

    const groupMap = new Map();

    databases.forEach((db) => {
      const diskSize = Number(db.disk_size) || 0;
      const docCount = Number(db.doc_count) || 0;
      const docDelCount = Number(db.doc_del_count) || 0;

      totalClusterBytes += diskSize;
      totalClusterDocs += docCount;
      totalClusterDeleted += docDelCount;
      if (db.partitioned) totalPartitionedDbs += 1;

      const groupKey = extractGroupKey(db.name);

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          name: groupKey,
          databases: [],
          totalDiskSize: 0,
          totalDocs: 0,
          totalDeletedDocs: 0,
          partitionedCount: 0,
        });
      }

      const g = groupMap.get(groupKey);
      g.databases.push({
        ...db,
        disk_size_num: diskSize,
        doc_count_num: docCount,
        doc_del_count_num: docDelCount,
      });
      g.totalDiskSize += diskSize;
      g.totalDocs += docCount;
      g.totalDeletedDocs += docDelCount;
      if (db.partitioned) g.partitionedCount += 1;
    });

    // Compute derived properties per group
    const computedGroups = Array.from(groupMap.values()).map((g) => {
      const avgDocSize = g.totalDocs > 0 ? Math.round(g.totalDiskSize / g.totalDocs) : 0;
      const percent = totalClusterBytes > 0 ? (g.totalDiskSize / totalClusterBytes) * 100 : 0;
      return {
        ...g,
        avgDocSize,
        percent,
      };
    });

    const clusterAvgDocSize =
      totalClusterDocs > 0 ? Math.round(totalClusterBytes / totalClusterDocs) : 0;

    return {
      groups: computedGroups,
      clusterStats: {
        totalBytes: totalClusterBytes,
        totalDocs: totalClusterDocs,
        totalDeleted: totalClusterDeleted,
        totalDbs: databases.length,
        partitionedDbs: totalPartitionedDbs,
        avgDocSize: clusterAvgDocSize,
        groupCount: computedGroups.length,
      },
    };
  }, [databases, groupMode, customRegex]);

  // Filter & Sort
  const filteredAndSortedGroups = useMemo(() => {
    let result = groups;

    // Filter by single dbs if toggled
    if (hideSingleDbs) {
      result = result.filter((g) => g.databases.length > 1);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((g) => {
        if (g.name.toLowerCase().includes(q)) return true;
        return g.databases.some((d) => d.name.toLowerCase().includes(q));
      });
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'size') {
        cmp = a.totalDiskSize - b.totalDiskSize;
      } else if (sortBy === 'docs') {
        cmp = a.totalDocs - b.totalDocs;
      } else if (sortBy === 'count') {
        cmp = a.databases.length - b.databases.length;
      } else if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'avgDoc') {
        cmp = a.avgDocSize - b.avgDocSize;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [groups, hideSingleDbs, searchQuery, sortBy, sortOrder]);

  // Top groups for distribution bar
  const topGroupsForDistribution = useMemo(() => {
    const sorted = [...groups].sort((a, b) => b.totalDiskSize - a.totalDiskSize);
    const top = sorted.slice(0, 5);
    const topTotal = top.reduce((sum, g) => sum + g.totalDiskSize, 0);
    const otherBytes = Math.max(0, clusterStats.totalBytes - topTotal);
    const otherPercent =
      clusterStats.totalBytes > 0 ? (otherBytes / clusterStats.totalBytes) * 100 : 0;

    return {
      top,
      otherBytes,
      otherPercent,
    };
  }, [groups, clusterStats]);

  // Expand / Collapse Handlers
  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(filteredAndSortedGroups.map((g) => g.name)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Export Reports (CSV / JSON)
  const handleExportCSV = () => {
    const headers = [
      'Group / Project',
      'Database Count',
      'Total Size (Bytes)',
      'Total Size Formatted',
      '% of Cluster',
      'Active Documents',
      'Deleted Documents',
      'Avg Doc Size (Bytes)',
      'Member Databases',
    ];

    const rows = filteredAndSortedGroups.map((g) => [
      `"${g.name.replace(/"/g, '""')}"`,
      g.databases.length,
      g.totalDiskSize,
      `"${formatBytes(g.totalDiskSize)}"`,
      `"${g.percent.toFixed(2)}%"`,
      g.totalDocs,
      g.totalDeletedDocs,
      g.avgDocSize,
      `"${g.databases.map((d) => d.name).join('; ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csvContent, `cloudant_storage_analytics_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      clusterSummary: clusterStats,
      groupingMode: groupMode,
      groups: filteredAndSortedGroups.map((g) => ({
        group: g.name,
        databaseCount: g.databases.length,
        totalDiskSizeBytes: g.totalDiskSize,
        totalDiskSizeFormatted: formatBytes(g.totalDiskSize),
        percentOfCluster: Number(g.percent.toFixed(2)),
        totalDocs: g.totalDocs,
        totalDeletedDocs: g.totalDeletedDocs,
        avgDocSizeBytes: g.avgDocSize,
        databases: g.databases.map((d) => ({
          name: d.name,
          docCount: d.doc_count_num,
          docDelCount: d.doc_del_count_num,
          diskSizeBytes: d.disk_size_num,
          partitioned: d.partitioned,
        })),
      })),
    };

    downloadFile(
      JSON.stringify(report, null, 2),
      `cloudant_storage_analytics_${Date.now()}.json`,
      'application/json'
    );
  };

  return (
    <div className="analytics-container">
      {/* Analytics Header Toolbar */}
      <div className="content-toolbar" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 2px 10px rgba(56, 189, 248, 0.3)',
            }}
          >
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="db-title" style={{ fontSize: '1.2rem', lineHeight: '1.2' }}>
              Database Storage & Sizing Analytics
            </h1>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Aggregate sizes and document distributions across database naming patterns and projects.
            </p>
          </div>
        </div>

        {/* Toolbar Right: Refresh & Exports */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onRefresh && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh database metrics"
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin-icon' : ''} />
              <span>Refresh</span>
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            title="Export analytics to CSV spreadsheet"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportJSON}
            title="Export full analytics report as JSON"
          >
            <Code2 size={13} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      <div className="view-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Hero KPI Metrics Cards */}
        <div className="analytics-hero-grid">
          {/* Card 1: Total Storage */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <span className="analytics-card-label">Total Cluster Storage</span>
              <div className="analytics-card-icon-wrap cyan">
                <HardDrive size={16} />
              </div>
            </div>
            <div className="analytics-card-value">
              {formatBytes(clusterStats.totalBytes)}
            </div>
            <div className="analytics-card-subtext">
              Across <strong>{clusterStats.totalDbs}</strong> databases
            </div>
          </div>

          {/* Card 2: Total Documents */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <span className="analytics-card-label">Total Documents</span>
              <div className="analytics-card-icon-wrap emerald">
                <FileText size={16} />
              </div>
            </div>
            <div className="analytics-card-value">
              {clusterStats.totalDocs.toLocaleString()}
            </div>
            <div className="analytics-card-subtext">
              {clusterStats.totalDeleted > 0 ? (
                <span>
                  + <strong>{clusterStats.totalDeleted.toLocaleString()}</strong> tombstones (deleted)
                </span>
              ) : (
                '0 deleted tombstones'
              )}
            </div>
          </div>

          {/* Card 3: Groups & Projects */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <span className="analytics-card-label">Project / Pattern Groups</span>
              <div className="analytics-card-icon-wrap indigo">
                <Layers size={16} />
              </div>
            </div>
            <div className="analytics-card-value">
              {clusterStats.groupCount}
            </div>
            <div className="analytics-card-subtext">
              <span>
                {clusterStats.partitionedDbs > 0
                  ? `${clusterStats.partitionedDbs} partitioned DBs`
                  : 'All standard non-partitioned'}
              </span>
            </div>
          </div>

          {/* Card 4: Avg Document Size */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <span className="analytics-card-label">Avg Document Size</span>
              <div className="analytics-card-icon-wrap amber">
                <PieChart size={16} />
              </div>
            </div>
            <div className="analytics-card-value">
              {formatBytes(clusterStats.avgDocSize)}
            </div>
            <div className="analytics-card-subtext">
              Storage density per doc
            </div>
          </div>
        </div>

        {/* Proportional Storage Distribution Bar */}
        {clusterStats.totalBytes > 0 && (
          <div className="analytics-section-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={16} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Storage Allocation by Project / Pattern
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Top 5 groups + Others
              </span>
            </div>

            {/* Segmented Bar */}
            <div className="distribution-bar-track">
              {topGroupsForDistribution.top.map((g, idx) => (
                <div
                  key={g.name}
                  className="distribution-bar-segment"
                  style={{
                    width: `${Math.max(g.percent, 1.5)}%`,
                    backgroundColor: GROUP_COLORS[idx % GROUP_COLORS.length],
                  }}
                  title={`${g.name}: ${formatBytes(g.totalDiskSize)} (${g.percent.toFixed(1)}%)`}
                />
              ))}
              {topGroupsForDistribution.otherPercent > 0 && (
                <div
                  className="distribution-bar-segment"
                  style={{
                    width: `${topGroupsForDistribution.otherPercent}%`,
                    backgroundColor: '#475569',
                  }}
                  title={`Others: ${formatBytes(topGroupsForDistribution.otherBytes)} (${topGroupsForDistribution.otherPercent.toFixed(1)}%)`}
                />
              )}
            </div>

            {/* Legend Pills */}
            <div className="distribution-legend">
              {topGroupsForDistribution.top.map((g, idx) => (
                <div key={g.name} className="legend-item">
                  <span
                    className="legend-color-dot"
                    style={{ backgroundColor: GROUP_COLORS[idx % GROUP_COLORS.length] }}
                  />
                  <span className="legend-name" title={g.name}>
                    {g.name}
                  </span>
                  <span className="legend-value">
                    {g.percent.toFixed(1)}% ({formatBytes(g.totalDiskSize)})
                  </span>
                </div>
              ))}
              {topGroupsForDistribution.otherPercent > 0 && (
                <div className="legend-item">
                  <span className="legend-color-dot" style={{ backgroundColor: '#475569' }} />
                  <span className="legend-name">Others</span>
                  <span className="legend-value">
                    {topGroupsForDistribution.otherPercent.toFixed(1)}% ({formatBytes(topGroupsForDistribution.otherBytes)})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pattern Grouping Controls & Filter Bar */}
        <div className="analytics-section-card" style={{ padding: '18px' }}>
          <div className="analytics-strategy-bar">
            {/* Left: Group Mode Selectors */}
            <div className="analytics-group-toggle-wrap">
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Grouping Strategy:
              </span>
              <div className="analytics-group-toggle">
                <button
                  className={`mode-btn ${groupMode === 'project' ? 'active' : ''}`}
                  onClick={() => setGroupMode('project')}
                  title="Group by Project across all years/months (e.g. proj_alpha_2025-07 & 2026-01 -> proj_alpha)"
                >
                  <Layers size={13} />
                  <span>Project (All-time)</span>
                </button>
                <button
                  className={`mode-btn ${groupMode === 'project_year' ? 'active' : ''}`}
                  onClick={() => setGroupMode('project_year')}
                  title="Group monthly databases by Project & Year (e.g. proj_alpha_2025-07 -> proj_alpha_2025)"
                >
                  <Calendar size={13} />
                  <span>Project by Year</span>
                </button>
                <button
                  className={`mode-btn ${groupMode === 'segment_1' ? 'active' : ''}`}
                  onClick={() => setGroupMode('segment_1')}
                  title="Group by 1st segment before underscore (e.g. proj, customer, ecommerce)"
                >
                  <Tag size={13} />
                  <span>1st Segment</span>
                </button>
                <button
                  className={`mode-btn ${groupMode === 'segment_2' ? 'active' : ''}`}
                  onClick={() => setGroupMode('segment_2')}
                  title="Group by 1st and 2nd segments (e.g. proj_alpha, customer_logs)"
                >
                  <Tag size={13} />
                  <span>1st + 2nd Segment</span>
                </button>
                <button
                  className={`mode-btn ${groupMode === 'custom' ? 'active' : ''}`}
                  onClick={() => setGroupMode('custom')}
                  title="Custom regular expression capture group"
                >
                  <Code2 size={13} />
                  <span>Custom Regex</span>
                </button>
                <button
                  className={`mode-btn ${groupMode === 'flat' ? 'active' : ''}`}
                  onClick={() => setGroupMode('flat')}
                  title="Flat view with no grouping"
                >
                  <Database size={13} />
                  <span>Flat (All DBs)</span>
                </button>
              </div>

              {groupMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ padding: '4px 10px', fontSize: '0.78rem', width: '180px', fontFamily: 'var(--font-mono)' }}
                    placeholder="Regex e.g. ^([a-zA-Z0-9]+)_"
                    value={customRegex}
                    onChange={(e) => setCustomRegex(e.target.value)}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Captures 1st group
                  </span>
                </div>
              )}
            </div>

            {/* Right: Expand / Collapse and Hide Single */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {groupMode !== 'flat' && (
                <>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      marginRight: '6px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={hideSingleDbs}
                      onChange={(e) => setHideSingleDbs(e.target.checked)}
                      style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
                    />
                    <span>Multi-DB groups only</span>
                  </label>

                  <button className="btn btn-ghost btn-sm" onClick={expandAll} title="Expand all groups">
                    Expand All
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={collapseAll} title="Collapse all groups">
                    Collapse All
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sub-bar: Search & Sorting */}
          <div
            style={{
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Search Input */}
            <div className="search-input-wrap" style={{ width: '280px' }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Filter by group or database name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sort Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sort by:</span>
              <select
                className="form-select"
                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="size">Total Size</option>
                <option value="docs">Document Count</option>
                <option value="count">Database Count</option>
                <option value="name">Name</option>
                <option value="avgDoc">Avg Doc Size</option>
              </select>

              <button
                className="btn btn-secondary btn-icon"
                style={{ padding: '5px' }}
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                title={`Sort ${sortOrder === 'desc' ? 'Ascending' : 'Descending'}`}
              >
                <ArrowUpDown size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Aggregated Group Table */}
        <div className="analytics-section-card table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '38px' }} />
                  <th>Group / Project Name</th>
                  <th style={{ width: '120px' }}>Databases</th>
                  <th style={{ width: '150px' }}>Total Storage</th>
                  <th style={{ width: '120px' }}>Share of Cluster</th>
                  <th style={{ width: '140px' }}>Active Docs</th>
                  <th style={{ width: '120px' }}>Avg Doc Size</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No groups match your search criteria or filter.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedGroups.map((group) => {
                    const isExpanded = expandedGroups.has(group.name);
                    const isSingle = group.databases.length === 1;

                    return (
                      <React.Fragment key={group.name}>
                        {/* Group Header Row */}
                        <tr
                          className="analytics-group-row"
                          onClick={() => toggleGroup(group.name)}
                          style={{
                            cursor: 'pointer',
                            background: isExpanded ? 'rgba(56, 189, 248, 0.05)' : undefined,
                          }}
                        >
                          {/* Chevron */}
                          <td style={{ textAlign: 'center', padding: '10px 6px' }}>
                            {isExpanded ? (
                              <ChevronDown size={16} color="var(--accent-cyan)" />
                            ) : (
                              <ChevronRight size={16} color="var(--text-muted)" />
                            )}
                          </td>

                          {/* Group Name & Badges */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.88rem',
                                }}
                              >
                                {group.name}
                              </span>
                              {group.partitionedCount > 0 && (
                                <span className="tag-pill partitioned" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                  {group.partitionedCount} Partitioned
                                </span>
                              )}
                            </div>
                          </td>

                          {/* DB Count Badge */}
                          <td>
                            <span className="tag-pill" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {group.databases.length} {group.databases.length === 1 ? 'db' : 'dbs'}
                            </span>
                          </td>

                          {/* Total Storage */}
                          <td style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                            {formatBytes(group.totalDiskSize)}
                          </td>

                          {/* Share of Cluster (Mini Bar + Percentage) */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '50px',
                                  height: '6px',
                                  borderRadius: '3px',
                                  background: 'var(--bg-tertiary)',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(group.percent, 100)}%`,
                                    background: 'var(--accent-cyan)',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                {group.percent.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Active Docs */}
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            {group.totalDocs.toLocaleString()}
                            {group.totalDeletedDocs > 0 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                                ({group.totalDeletedDocs} deleted)
                              </span>
                            )}
                          </td>

                          {/* Avg Doc Size */}
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {formatBytes(group.avgDocSize)}
                          </td>

                          {/* Action */}
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            {isSingle ? (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => onSelectDb(group.databases[0].name)}
                                title={`Open ${group.databases[0].name} in Explorer`}
                                style={{ gap: '4px' }}
                              >
                                <ExternalLink size={13} color="var(--accent-cyan)" />
                                <span>Open</span>
                              </button>
                            ) : (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => toggleGroup(group.name)}
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {isExpanded ? 'Collapse' : 'Details'}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Child Databases Sub-Table */}
                        {isExpanded && (
                          <tr style={{ background: 'var(--bg-primary)' }}>
                            <td colSpan={8} style={{ padding: '0 0 12px 0' }}>
                              <div className="analytics-sub-table-wrap">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px 4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Member Databases in <code>{group.name}</code> ({group.databases.length})
                                  </span>
                                  {group.databases.length > 4 && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
                                      Scroll to view all {group.databases.length} databases &darr;
                                    </span>
                                  )}
                                </div>
                                <div className="analytics-sub-table-scroll">
                                  <table className="analytics-sub-table">
                                    <thead>
                                      <tr>
                                        <th>Database Name</th>
                                        <th>Storage Size</th>
                                        <th>Docs</th>
                                        <th>Deleted</th>
                                        <th>Partitioned</th>
                                        <th style={{ textAlign: 'right' }}>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.databases.map((db) => (
                                        <tr key={db.name}>
                                          <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <Database size={13} color="var(--accent-cyan)" />
                                              <span>{db.name}</span>
                                            </div>
                                          </td>
                                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                            {formatBytes(db.disk_size_num)}
                                          </td>
                                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                                            {db.doc_count_num.toLocaleString()}
                                          </td>
                                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                            {db.doc_del_count_num}
                                          </td>
                                          <td>
                                            {db.partitioned ? (
                                              <span className="tag-pill partitioned" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                                                Yes
                                              </span>
                                            ) : (
                                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                                No
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ textAlign: 'right' }}>
                                            <button
                                              className="btn btn-secondary btn-sm"
                                              onClick={() => onSelectDb(db.name)}
                                              title={`Inspect documents in ${db.name}`}
                                              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                                            >
                                              <ExternalLink size={12} />
                                              <span>Inspect in Explorer</span>
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

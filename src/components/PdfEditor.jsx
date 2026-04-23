import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

// ── Icons ──
const IconBack = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const IconFile = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const IconLayers = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25L12 17.25 2.25 12l4.179-2.25m11.142 0l4.179 2.25L12 22.5l-9.75-5.25 4.179-2.25" />
  </svg>
);
const IconOrganize = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v3.75m0 10.5V21m7.5-18v3.75m0 10.5V21" />
  </svg>
);
const IconExport = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);
const IconInfo = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
);
const IconZoomIn = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
  </svg>
);
const IconZoomOut = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
  </svg>
);
const IconChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);
const IconChevronRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);
const IconPages = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);
const IconTrash = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const IconPlus = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const IconArrowUp = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);
const IconArrowDown = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);
const IconImages = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 6.75h.008v.008H6.75V6.75zm10.5 0h.008v.008h-.008V6.75zM6.75 3h10.5a3.75 3.75 0 013.75 3.75v10.5a3.75 3.75 0 01-3.75 3.75H6.75a3.75 3.75 0 01-3.75-3.75V6.75A3.75 3.75 0 016.75 3z" />
  </svg>
);
const IconDownload = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);
const IconImageAdd = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 6.75h.008v.008H6.75V6.75zM6.75 3h10.5a3.75 3.75 0 013.75 3.75v10.5a3.75 3.75 0 01-3.75 3.75H6.75a3.75 3.75 0 01-3.75-3.75V6.75A3.75 3.75 0 016.75 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v6m3-3h-6" strokeWidth={2.5} />
  </svg>
);
const IconEye = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12s-3.75 7.5-9.75 7.5S2.25 12 2.25 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeOff = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58a2 2 0 102.83 2.83" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 5.08A10.56 10.56 0 0112 4.5c6 0 9.75 7.5 9.75 7.5a15.64 15.64 0 01-4.04 4.77M6.1 6.1A15.74 15.74 0 002.25 12s3.75 7.5 9.75 7.5a10.9 10.9 0 005.04-1.25" />
  </svg>
);

const GROUPABLE_OBJECT_TYPES = new Set(["path", "shading", "form"]);
const GROUP_CLUSTER_TYPES = new Set(["path", "shading"]);
const SHAPE_OBJECT_TYPES = new Set(["path", "shading", "form"]);
const MANUAL_GROUPS_STORAGE_PREFIX = "pdf-editor-manual-groups:";

function getManualGroupsStorageKey(pdfPath) {
  return `${MANUAL_GROUPS_STORAGE_PREFIX}${pdfPath}`;
}

function loadSavedManualGroups(pdfPath) {
  if (!pdfPath || typeof window === "undefined" || !window.localStorage) return {};

  try {
    const raw = window.localStorage.getItem(getManualGroupsStorageKey(pdfPath));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([pageKey, groups]) => {
          if (!Array.isArray(groups)) return [pageKey, []];
          const normalizedGroups = groups
            .filter((group) => group && Array.isArray(group.memberIndices))
            .map((group, index) => ({
              id: typeof group.id === "string" ? group.id : `manual-${pageKey}-${index}`,
              label: typeof group.label === "string" && group.label.trim() ? group.label : `Manual Group ${index + 1}`,
              memberIndices: Array.from(new Set(group.memberIndices.filter((idx) => Number.isInteger(idx)))).sort((a, b) => a - b),
            }))
            .filter((group) => group.memberIndices.length >= 2);
          return [pageKey, normalizedGroups];
        })
        .filter(([, groups]) => groups.length > 0),
    );
  } catch {
    return {};
  }
}

function persistManualGroups(pdfPath, manualGroupsByPage) {
  if (!pdfPath || typeof window === "undefined" || !window.localStorage) return;

  try {
    const normalized = Object.fromEntries(
      Object.entries(manualGroupsByPage)
        .map(([pageKey, groups]) => {
          if (!Array.isArray(groups)) return [pageKey, []];
          const serializableGroups = groups
            .filter((group) => group && Array.isArray(group.memberIndices))
            .map((group, index) => ({
              id: typeof group.id === "string" ? group.id : `manual-${pageKey}-${index}`,
              label: typeof group.label === "string" && group.label.trim() ? group.label : `Manual Group ${index + 1}`,
              memberIndices: Array.from(new Set(group.memberIndices.filter((idx) => Number.isInteger(idx)))).sort((a, b) => a - b),
            }))
            .filter((group) => group.memberIndices.length >= 2);
          return [pageKey, serializableGroups];
        })
        .filter(([, groups]) => groups.length > 0),
    );

    const storageKey = getManualGroupsStorageKey(pdfPath);
    if (Object.keys(normalized).length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  } catch {
    // Ignore persistence failures; manual groups still work for the current session.
  }
}

function getObjectByIndex(pageObjects, idx) {
  return pageObjects.find((obj) => obj.index === idx) || null;
}

function boundsAreRelated(boundsA, boundsB) {
  if (!boundsA || !boundsB) return false;

  const [leftA, bottomA, rightA, topA] = boundsA;
  const [leftB, bottomB, rightB, topB] = boundsB;
  const widthA = Math.max(0.0001, rightA - leftA);
  const heightA = Math.max(0.0001, topA - bottomA);
  const widthB = Math.max(0.0001, rightB - leftB);
  const heightB = Math.max(0.0001, topB - bottomB);
  const areaA = widthA * heightA;
  const areaB = widthB * heightB;
  const tol = 1.0;

  const containsA =
    leftB >= leftA - tol &&
    bottomB >= bottomA - tol &&
    rightB <= rightA + tol &&
    topB <= topA + tol;
  const containsB =
    leftA >= leftB - tol &&
    bottomA >= bottomB - tol &&
    rightA <= rightB + tol &&
    topA <= topB + tol;

  const interLeft = Math.max(leftA, leftB);
  const interBottom = Math.max(bottomA, bottomB);
  const interRight = Math.min(rightA, rightB);
  const interTop = Math.min(topA, topB);
  const interWidth = Math.max(0, interRight - interLeft);
  const interHeight = Math.max(0, interTop - interBottom);
  const interArea = interWidth * interHeight;
  const overlapRatio = interArea / Math.min(areaA, areaB);

  const gapX = Math.max(0, Math.max(leftA, leftB) - Math.min(rightA, rightB));
  const gapY = Math.max(0, Math.max(bottomA, bottomB) - Math.min(topA, topB));
  const closeEnough =
    gapX <= Math.max(2, Math.min(widthA, widthB) * 0.35) &&
    gapY <= Math.max(2, Math.min(heightA, heightB) * 0.35);

  const sizeRatio = Math.max(areaA, areaB) / Math.min(areaA, areaB);

  return containsA || containsB || overlapRatio > 0.55 || (closeEnough && sizeRatio < 12);
}

function getBoundsMetrics(bounds) {
  const [left, bottom, right, top] = bounds;
  const width = Math.max(0.0001, right - left);
  const height = Math.max(0.0001, top - bottom);
  const area = width * height;
  const centerX = left + width / 2;
  const centerY = bottom + height / 2;
  return { left, bottom, right, top, width, height, area, centerX, centerY };
}

function expandedBoundsOverlap(boundsA, boundsB, padding) {
  const a = getBoundsMetrics(boundsA);
  const b = getBoundsMetrics(boundsB);
  return !(
    a.right + padding < b.left ||
    b.right + padding < a.left ||
    a.top + padding < b.bottom ||
    b.top + padding < a.bottom
  );
}

function areObjectsStructurallyRelated(objA, objB) {
  if (!objA || !objB) return false;
  if (objA.index === objB.index) return true;

  const aChildren = Array.isArray(objA.children) ? objA.children : [];
  const bChildren = Array.isArray(objB.children) ? objB.children : [];

  if (aChildren.includes(objB.index) || bChildren.includes(objA.index)) return true;
  if (objA.parent_index != null && objA.parent_index === objB.index) return true;
  if (objB.parent_index != null && objB.parent_index === objA.index) return true;
  if (objA.parent_index != null && objA.parent_index === objB.parent_index) return true;

  return false;
}

function areObjectsInSameLocalGroup(objA, objB) {
  if (!objA?.bounds || !objB?.bounds) return false;
  if (!GROUP_CLUSTER_TYPES.has(objA.object_type) || !GROUP_CLUSTER_TYPES.has(objB.object_type)) {
    return false;
  }

  const metricsA = getBoundsMetrics(objA.bounds);
  const metricsB = getBoundsMetrics(objB.bounds);
  const sizeRatio = Math.max(metricsA.area, metricsB.area) / Math.min(metricsA.area, metricsB.area);
  if (sizeRatio > 10) return false;

  const interLeft = Math.max(metricsA.left, metricsB.left);
  const interBottom = Math.max(metricsA.bottom, metricsB.bottom);
  const interRight = Math.min(metricsA.right, metricsB.right);
  const interTop = Math.min(metricsA.top, metricsB.top);
  const interWidth = Math.max(0, interRight - interLeft);
  const interHeight = Math.max(0, interTop - interBottom);
  const interArea = interWidth * interHeight;
  const overlapRatio = interArea / Math.min(metricsA.area, metricsB.area);

  if (overlapRatio > 0.2) return true;

  const padding = Math.min(
    8,
    Math.max(1.5, Math.min(metricsA.width, metricsA.height, metricsB.width, metricsB.height) * 0.5),
  );
  if (!expandedBoundsOverlap(objA.bounds, objB.bounds, padding)) return false;

  const deltaX = Math.abs(metricsA.centerX - metricsB.centerX);
  const deltaY = Math.abs(metricsA.centerY - metricsB.centerY);
  const nearInX = deltaX <= Math.max(metricsA.width, metricsB.width) * 1.25 + 4;
  const nearInY = deltaY <= Math.max(metricsA.height, metricsB.height) * 1.25 + 4;

  return nearInX && nearInY;
}

function createGroupDefinition(pageObjects, memberIndices, index, options = {}) {
  const { id, label, isManual = false, skipDensityCheck = false, densityThreshold = 0.08 } = options;
  const normalizedIndices = Array.from(new Set(memberIndices)).sort((a, b) => a - b);
  const members = normalizedIndices
    .map((memberIdx) => getObjectByIndex(pageObjects, memberIdx))
    .filter((member) => member?.bounds);

  if (members.length < 2) return null;

  const union = members.reduce((acc, member) => {
    const metrics = getBoundsMetrics(member.bounds);
    return {
      left: Math.min(acc.left, metrics.left),
      bottom: Math.min(acc.bottom, metrics.bottom),
      right: Math.max(acc.right, metrics.right),
      top: Math.max(acc.top, metrics.top),
      totalArea: acc.totalArea + metrics.area,
    };
  }, {
    left: Number.POSITIVE_INFINITY,
    bottom: Number.POSITIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
    top: Number.NEGATIVE_INFINITY,
    totalArea: 0,
  });

  const unionArea = Math.max(0.0001, (union.right - union.left) * (union.top - union.bottom));
  const density = union.totalArea / unionArea;
  if (!skipDensityCheck && density < densityThreshold) return null;

  const pathCount = members.filter((member) => member.object_type === "path").length;
  const shadingCount = members.filter((member) => member.object_type === "shading").length;
  const formCount = members.filter((member) => member.object_type === "form").length;

  let resolvedLabel = label;
  if (!resolvedLabel) {
    if (isManual) {
      resolvedLabel = `Manual Group ${index + 1}`;
    } else if (pathCount > 0 && shadingCount === 0 && formCount === 0) {
      resolvedLabel = `Path Group ${index + 1}`;
    } else if (formCount > 0 && pathCount === 0 && shadingCount === 0) {
      resolvedLabel = `Form Group ${index + 1}`;
    } else {
      resolvedLabel = `Group ${index + 1}`;
    }
  }

  return {
    id: id || `${isManual ? "manual" : "group"}-${index}`,
    label: resolvedLabel,
    memberIndices: normalizedIndices,
    members,
    isManual,
  };
}

function getVisibilityBundleIndicesForObjects(pageObjects, idx) {
  const target = getObjectByIndex(pageObjects, idx);
  if (!target) return [idx];

  const bundle = new Set([idx]);

  if (target.parent_index != null) {
    bundle.add(target.parent_index);
  }
  if (target.children && target.children.length > 0) {
    for (const childIdx of target.children) {
      bundle.add(childIdx);
    }
  }

  if (!target.bounds) {
    return Array.from(bundle);
  }

  const targetIsVectorLike = GROUPABLE_OBJECT_TYPES.has(target.object_type);

  for (const candidate of pageObjects) {
    if (candidate.index === idx || !candidate.bounds) continue;

    const sameParent =
      target.parent_index != null && candidate.parent_index === target.parent_index;
    const parentChildLink =
      candidate.index === target.parent_index || candidate.parent_index === target.index;
    const candidateIsVectorLike = GROUPABLE_OBJECT_TYPES.has(candidate.object_type);

    if (!(targetIsVectorLike && candidateIsVectorLike) && !sameParent && !parentChildLink) {
      continue;
    }

    if (sameParent || parentChildLink || boundsAreRelated(target.bounds, candidate.bounds)) {
      bundle.add(candidate.index);
    }
  }

  return Array.from(bundle);
}

function buildObjectGroups(pageObjects, manualGroups = []) {
  const candidates = pageObjects.filter(
    (obj) => GROUP_CLUSTER_TYPES.has(obj.object_type) && obj.bounds,
  );
  const visited = new Set();
  const groups = [];

  for (const candidate of candidates) {
    if (visited.has(candidate.index)) continue;

    const stack = [candidate.index];
    const component = new Set();

    while (stack.length > 0) {
      const currentIdx = stack.pop();
      if (visited.has(currentIdx)) continue;
      visited.add(currentIdx);
      component.add(currentIdx);

      const current = getObjectByIndex(pageObjects, currentIdx);
      if (!current?.bounds) continue;

      for (const other of candidates) {
        if (visited.has(other.index) || other.index === currentIdx) continue;
        if (areObjectsInSameLocalGroup(current, other)) {
          stack.push(other.index);
        }
      }
    }

    if (component.size >= 2) {
      groups.push(component);
    }
  }

  const normalizedManualGroups = manualGroups
    .map((group, index) => createGroupDefinition(pageObjects, group.memberIndices, index, {
      id: group.id,
      label: group.label,
      isManual: true,
      skipDensityCheck: true,
    }))
    .filter(Boolean);

  const manualMemberSet = new Set(normalizedManualGroups.flatMap((group) => group.memberIndices));

  const autoGroups = groups
    .map((set, index) => createGroupDefinition(
      pageObjects,
      Array.from(set).filter((memberIdx) => !manualMemberSet.has(memberIdx)),
      index,
    ))
    .filter(Boolean);

  return [...normalizedManualGroups, ...autoGroups];
}

export default function PdfEditor({ onBack }) {
  const [pdfPath, setPdfPath] = useState("");
  const [fileName, setFileName] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [renderedImage, setRenderedImage] = useState(null);
  const [layers, setLayers] = useState([]);
  const [activeLayers, setActiveLayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(50);
  const [activePanel, setActivePanel] = useState("pages"); // pages | layers | export | info
  const [exportFormat, setExportFormat] = useState("png");
  const [exportStatus, setExportStatus] = useState("");
  const [thumbnails, setThumbnails] = useState([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const [extractedImages, setExtractedImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesSaveFormat, setImagesSaveFormat] = useState("png");
  const [transparentBg, setTransparentBg] = useState(true);
  const [pageObjects, setPageObjects] = useState([]);
  const [hoveredObjectIdx, setHoveredObjectIdx] = useState(null);
  const [hoveredGroupIndices, setHoveredGroupIndices] = useState(new Set());
  const [selectedObjectIndices, setSelectedObjectIndices] = useState(new Set());
  const [hiddenObjectIndices, setHiddenObjectIndices] = useState(new Set());
  const [showObjectOverlay, setShowObjectOverlay] = useState(true);
  const [objectFilter, setObjectFilter] = useState("all"); // all | image | text | path | exportable
  const [layerViewMode, setLayerViewMode] = useState("objects"); // objects | groups
  const [manualGroupsByPage, setManualGroupsByPage] = useState({});
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });

  // Export loading guard (prevents freeze from double-click)
  const [isExporting, setIsExporting] = useState(false);

  // Excluded child indices (for nested layer unselection)
  const [excludedChildren, setExcludedChildren] = useState(new Set());

  // Marquee (lasso) selection state
  const [marqueeActive, setMarqueeActive] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState(null); // {x, y} in display coords
  const [marqueeEnd, setMarqueeEnd] = useState(null);     // {x, y} in display coords

  // Per-page download format for organize view
  const [downloadFormat, setDownloadFormat] = useState("png");
  const [downloadingPageIdx, setDownloadingPageIdx] = useState(null);

  // Pointer-based drag-and-drop for organize grid
  const [dragState, setDragState] = useState({ active: false, fromIdx: null, overIdx: null });
  const dragGhostRef = useRef(null);
  const gridRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragFromIdxRef = useRef(null);
  const renderRequestIdRef = useRef(0);
  const hiddenPreviewTimeoutRef = useRef(null);
  const lastHiddenSignatureRef = useRef("");
  const objectRowRefs = useRef(new Map());
  const pendingSidebarFocusIdxRef = useRef(null);

  const isLoaded = !!metadata;
  const waitForNextPaint = useCallback(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve())),
    [],
  );
  const manualGroupsForPage = manualGroupsByPage[currentPageIndex] || [];

  // ── Open PDF via native file dialog ──
  const handleOpenPdf = useCallback(async () => {
    try {
      const selected = await invoke("select_pdf_file");
      if (!selected) return;
      await loadPdf(selected);
    } catch (err) {
      setError(`Failed to open file dialog: ${err}`);
    }
  }, []);

  const loadPdf = async (filePath) => {
    setIsLoading(true);
    setError("");
    setRenderedImage(null);
    setExportStatus("");
    setManualGroupsByPage(loadSavedManualGroups(filePath));

    try {
      const response = await invoke("pdf_load", { filePath });

      if (response.success) {
        setPdfPath(filePath);
        setFileName(filePath.split(/[/\\]/).pop());
        setMetadata(response.metadata);
        setPages(response.pages || []);
        setCurrentPageIndex(0);

        const layersData = await invoke("pdf_get_layers");
        setLayers(layersData);
        setActiveLayers(layersData.map((l) => l.id));

        // Render first page
        if (response.pages?.length > 0) {
          await renderPage(0, layersData.map((l) => l.id), response.pages);
        }

        // Load thumbnails in background
        (async () => {
          try {
            const thumbs = await invoke("pdf_get_thumbnails", { thumbWidth: 150 });
            setThumbnails(thumbs);
          } catch (_) {}
        })();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(`Failed to load PDF: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = useCallback(
    async (pageIndex, activeLayerIds, pagesOverride, options = {}) => {
      const { suppressLoading = false } = options;
      const pgs = pagesOverride || pages;
      if (!pgs.length || pageIndex >= pgs.length) return;
      const page = pgs[pageIndex];
      if (!page || !page.width) return;

      const requestId = ++renderRequestIdRef.current;

      if (!suppressLoading) {
        setIsLoading(true);
      }
      try {
        // Use a lighter render for interactive layer editing to keep hide/show responsive.
        const isInteractivePreview = activePanel === "images";
        const renderScale = isInteractivePreview ? 2.15 : 3;
        const renderCap = isInteractivePreview ? 1800 : 2400;
        const renderWidth = Math.min(renderCap, Math.floor(page.width * renderScale));
        const aspectRatio = page.height / page.width;
        const renderHeight = Math.floor(renderWidth * aspectRatio);
        const response = await invoke("pdf_render_page", {
          request: {
            page_index: pageIndex,
            width: renderWidth,
            height: renderHeight,
            active_layers: activeLayerIds || activeLayers,
            hidden_object_indices: activePanel === "images" ? Array.from(hiddenObjectIndices) : [],
          },
        });

        if (requestId !== renderRequestIdRef.current) return;

        if (response.success && response.image_data) {
          setRenderedImage(response.image_data);
        } else {
          setError(response.message);
        }
      } catch (err) {
        if (requestId === renderRequestIdRef.current) {
          setError(`Render failed: ${err}`);
        }
      } finally {
        if (!suppressLoading && requestId === renderRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [pages, activeLayers, activePanel, hiddenObjectIndices],
  );

  useEffect(() => {
    if (!isLoaded || activePanel !== "images") {
      if (hiddenPreviewTimeoutRef.current) {
        clearTimeout(hiddenPreviewTimeoutRef.current);
        hiddenPreviewTimeoutRef.current = null;
      }
      lastHiddenSignatureRef.current = Array.from(hiddenObjectIndices).sort((a, b) => a - b).join(",");
      return;
    }

    const hiddenSignature = Array.from(hiddenObjectIndices).sort((a, b) => a - b).join(",");
    if (hiddenSignature === lastHiddenSignatureRef.current) return;
    lastHiddenSignatureRef.current = hiddenSignature;

    if (hiddenPreviewTimeoutRef.current) {
      clearTimeout(hiddenPreviewTimeoutRef.current);
    }

    hiddenPreviewTimeoutRef.current = setTimeout(() => {
      renderPage(currentPageIndex, activeLayers, undefined, { suppressLoading: true });
      hiddenPreviewTimeoutRef.current = null;
    }, 90);

    return () => {
      if (hiddenPreviewTimeoutRef.current) {
        clearTimeout(hiddenPreviewTimeoutRef.current);
        hiddenPreviewTimeoutRef.current = null;
      }
    };
  }, [hiddenObjectIndices, activePanel, isLoaded, currentPageIndex, activeLayers, renderPage]);

  // ── Navigation ──
  const goToPreviousPage = useCallback(() => {
    if (currentPageIndex > 0) {
      const idx = currentPageIndex - 1;
      setCurrentPageIndex(idx);
      renderPage(idx, activeLayers);
    }
  }, [currentPageIndex, activeLayers, renderPage]);

  const goToNextPage = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      const idx = currentPageIndex + 1;
      setCurrentPageIndex(idx);
      renderPage(idx, activeLayers);
    }
  }, [currentPageIndex, pages.length, activeLayers, renderPage]);

  // ── Layer Toggle ──
  const toggleLayer = useCallback(
    async (layerId) => {
      const next = activeLayers.includes(layerId)
        ? activeLayers.filter((id) => id !== layerId)
        : [...activeLayers, layerId];
      setActiveLayers(next);
      await renderPage(currentPageIndex, next);
    },
    [activeLayers, currentPageIndex, renderPage],
  );

  // ── Export ──
  const handleExportPage = useCallback(async () => {
    if (!pdfPath || isExporting) return;
    setIsExporting(true);
    setExportStatus("Preparing page export...");
    setError("");
    try {
      await waitForNextPaint();
      const ts = Date.now();
      const outputPath = `${pdfPath}-page${currentPageIndex + 1}-${ts}.${exportFormat}`;
      const page = pages[currentPageIndex];
      const ok = await invoke("pdf_export_page", {
        request: {
          page_index: currentPageIndex,
          output_path: outputPath,
          width: Math.floor(page.width * 3),
          height: Math.floor(page.height * 3),
          format: exportFormat,
        },
      });
      if (ok) {
        setExportStatus(`Saved to ${outputPath}`);
      }
    } catch (err) {
      setError(`Export failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  }, [pdfPath, currentPageIndex, pages, exportFormat, isExporting, waitForNextPaint]);

  // ── Close PDF ──
  const handleClosePdf = useCallback(async () => {
    try {
      await invoke("pdf_unload");
    } catch (_) {}
    setPdfPath("");
    setFileName("");
    setMetadata(null);
    setPages([]);
    setRenderedImage(null);
    setLayers([]);
    setActiveLayers([]);
    setError("");
    setExportStatus("");
    setCurrentPageIndex(0);
    setZoom(50);
    setThumbnails([]);
    setExtractedImages([]);
    setPageObjects([]);
    setSelectedObjectIndices(new Set());
    setHiddenObjectIndices(new Set());
    setHoveredObjectIdx(null);
    setHoveredGroupIndices(new Set());
    setIsExporting(false);
    setExcludedChildren(new Set());
    setManualGroupsByPage({});
  }, []);

  // ── Load thumbnails ──
  const loadThumbnails = useCallback(async () => {
    setThumbsLoading(true);
    try {
      const thumbs = await invoke("pdf_get_thumbnails", { thumbWidth: 150 });
      setThumbnails(thumbs);
    } catch (err) {
      console.error("Thumbnails failed:", err);
    } finally {
      setThumbsLoading(false);
    }
  }, []);

  // ── Page management ──
  const handleDeletePage = useCallback(async (pageIndex) => {
    if (pages.length <= 1) return; // don't delete the last page
    try {
      const newPages = await invoke("pdf_delete_pages", { pageIndices: [pageIndex] });
      setPages(newPages);
      const newIdx = Math.min(currentPageIndex, newPages.length - 1);
      setCurrentPageIndex(newIdx);
      await renderPage(newIdx, activeLayers, newPages);
      loadThumbnails();
    } catch (err) {
      setError(`Delete failed: ${err}`);
    }
  }, [pages, currentPageIndex, activeLayers, renderPage, loadThumbnails]);

  const handleInsertBlankPage = useCallback(async (position) => {
    try {
      const newPages = await invoke("pdf_insert_blank_page", { position });
      setPages(newPages);
      setCurrentPageIndex(position);
      await renderPage(position, activeLayers, newPages);
      loadThumbnails();
    } catch (err) {
      setError(`Insert failed: ${err}`);
    }
  }, [activeLayers, renderPage, loadThumbnails]);

  const handleMovePage = useCallback(async (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= pages.length) return;

    // Build new order by swapping
    const newOrder = pages.map((_, i) => i);
    [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];

    try {
      const newPages = await invoke("pdf_reorder_pages", { newOrder });
      setPages(newPages);
      setCurrentPageIndex(toIndex);
      await renderPage(toIndex, activeLayers, newPages);
      loadThumbnails();
    } catch (err) {
      setError(`Reorder failed: ${err}`);
    }
  }, [pages, activeLayers, renderPage, loadThumbnails]);

  // ── Pointer-based drag reorder ──
  const handleDragReorder = useCallback(async (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= pages.length || toIndex >= pages.length) return;

    const order = pages.map((_, i) => i);
    const [removed] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, removed);

    try {
      const newPages = await invoke("pdf_reorder_pages", { newOrder: order });
      setPages(newPages);
      setCurrentPageIndex(toIndex);
      loadThumbnails();
    } catch (err) {
      setError(`Reorder failed: ${err}`);
    }
  }, [pages, activeLayers, renderPage, loadThumbnails]);

  const getCardIdxFromPoint = useCallback((clientX, clientY) => {
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      const attr = el.getAttribute("data-page-idx");
      if (attr !== null) return parseInt(attr, 10);
      // Check parent (for inner elements)
      const parentAttr = el.parentElement?.getAttribute("data-page-idx");
      if (parentAttr !== null) return parseInt(parentAttr, 10);
    }
    return null;
  }, []);

  const onDragPointerDown = useCallback((e, idx) => {
    // Only start drag from the card area (not buttons)
    if (e.target.closest("button")) return;
    dragFromIdxRef.current = idx;
    isDraggingRef.current = false;

    const onMove = (moveE) => {
      const dx = moveE.clientX - dragStartPos.current.x;
      const dy = moveE.clientY - dragStartPos.current.y;

      // Require 8px movement to start dragging (prevents accidental drags)
      if (!isDraggingRef.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        isDraggingRef.current = true;
        setDragState({ active: true, fromIdx: dragFromIdxRef.current, overIdx: null });

        // Create ghost element
        if (!dragGhostRef.current) {
          const ghost = document.createElement("div");
          ghost.className = "fixed z-[9999] pointer-events-none rounded-xl border-2 border-rose-400 bg-slate-800/90 shadow-2xl shadow-rose-500/30 backdrop-blur-sm flex items-center justify-center";
          ghost.style.width = "100px";
          ghost.style.height = "80px";
          ghost.style.transition = "none";
          ghost.innerHTML = `<span class="text-rose-400 font-bold text-lg">${dragFromIdxRef.current + 1}</span>`;
          document.body.appendChild(ghost);
          dragGhostRef.current = ghost;
        }
      }

      if (isDraggingRef.current && dragGhostRef.current) {
        dragGhostRef.current.style.left = `${moveE.clientX - 50}px`;
        dragGhostRef.current.style.top = `${moveE.clientY - 40}px`;

        // Hide ghost temporarily to hit-test cards beneath
        dragGhostRef.current.style.display = "none";
        const overIdx = getCardIdxFromPoint(moveE.clientX, moveE.clientY);
        dragGhostRef.current.style.display = "";

        if (overIdx !== null && overIdx !== dragFromIdxRef.current) {
          setDragState((prev) => ({ ...prev, overIdx }));
        } else {
          setDragState((prev) => ({ ...prev, overIdx: null }));
        }
      }
    };

    const onUp = (upE) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      if (dragGhostRef.current) {
        document.body.removeChild(dragGhostRef.current);
        dragGhostRef.current = null;
      }

      if (isDraggingRef.current) {
        // Hide ghost to hit-test final drop target
        const overIdx = getCardIdxFromPoint(upE.clientX, upE.clientY);
        if (overIdx !== null && overIdx !== dragFromIdxRef.current) {
          handleDragReorder(dragFromIdxRef.current, overIdx);
        }
      }

      isDraggingRef.current = false;
      dragFromIdxRef.current = null;
      setDragState({ active: false, fromIdx: null, overIdx: null });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [getCardIdxFromPoint, handleDragReorder]);

  // ── Download a specific page as image ──
  const handleDownloadPage = useCallback(async (pageIndex, format) => {
    if (!pdfPath || downloadingPageIdx !== null) return;
    setDownloadingPageIdx(pageIndex);
    setError("");
    try {
      const page = pages[pageIndex];
      const ts = Date.now();
      const outputPath = `${pdfPath}-page${pageIndex + 1}-${ts}.${format}`;
      await invoke("pdf_export_page", {
        request: {
          page_index: pageIndex,
          output_path: outputPath,
          width: Math.floor(page.width * 3),
          height: Math.floor(page.height * 3),
          format,
        },
      });
      setExportStatus(`Saved page ${pageIndex + 1} to ${outputPath}`);
    } catch (err) {
      setError(`Download page ${pageIndex + 1} failed: ${err}`);
    } finally {
      setDownloadingPageIdx(null);
    }
  }, [pdfPath, pages, downloadingPageIdx]);

  // ── Insert image as new page ──
  const handleAddImageAsPage = useCallback(async (position) => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const filePath = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif", "gif"],
          },
        ],
      });
      if (!filePath) return;

      const imagePath = typeof filePath === "string" ? filePath : filePath.path;
      if (!imagePath) return;

      const newPages = await invoke("pdf_insert_image_as_page", {
        request: { image_path: imagePath, position },
      });
      setPages(newPages);
      setCurrentPageIndex(position);
      await renderPage(position, activeLayers, newPages);
      loadThumbnails();
    } catch (err) {
      setError(`Add image as page failed: ${err}`);
    }
  }, [activeLayers, renderPage, loadThumbnails]);

  // ── Zoom ──
  const zoomIn = () => setZoom((z) => Math.min(z + 10, 500));
  const zoomOut = () => setZoom((z) => Math.max(z - 10, 10));
  const zoomFit = () => setZoom(50);

  // Mouse wheel zoom on canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return; // only zoom with Ctrl+scroll
      e.preventDefault();
      setZoom((z) => {
        const delta = e.deltaY > 0 ? -10 : 10;
        return Math.min(500, Math.max(25, z + delta));
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Extract images from current page ──
  const extractImages = useCallback(async (pageIndex) => {
    setImagesLoading(true);
    setExtractedImages([]);
    try {
      const images = await invoke("pdf_extract_page_images", { pageIndex });
      setExtractedImages(images);
    } catch (err) {
      setError(`Image extraction failed: ${err}`);
    } finally {
      setImagesLoading(false);
    }
  }, []);

  // ── Fetch page objects (for bounding box overlay) ──
  const fetchPageObjects = useCallback(async (pageIndex) => {
    try {
      const objs = await invoke("pdf_get_page_objects", { pageIndex });
      setPageObjects(objs);
      setHiddenObjectIndices(new Set());
      setSelectedObjectIndices(new Set());
      setExcludedChildren(new Set());
      setHoveredObjectIdx(null);
      setHoveredGroupIndices(new Set());
    } catch (err) {
      console.error("Failed to get page objects:", err);
      setPageObjects([]);
      setHiddenObjectIndices(new Set());
      setHoveredGroupIndices(new Set());
    }
  }, []);

  // Auto-fetch page objects when switching to images panel or changing page
  useEffect(() => {
    if (activePanel === "images" && isLoaded) {
      fetchPageObjects(currentPageIndex);
      setExtractedImages([]);
    } else {
      setPageObjects([]);
      setSelectedObjectIndices(new Set());
      setHiddenObjectIndices(new Set());
      setHoveredObjectIdx(null);
      setHoveredGroupIndices(new Set());
    }
  }, [activePanel, currentPageIndex, isLoaded, fetchPageObjects]);

  // ── Save extracted image to disk ──
  const handleSaveExtractedImage = useCallback(async (objectIndex, imgIndex) => {
    if (!pdfPath || isExporting) return;
    setIsExporting(true);
    setExportStatus(`Preparing image ${imgIndex + 1} export...`);
    setError("");
    try {
      await waitForNextPaint();
      const ext = imagesSaveFormat;
      const outputPath = `${pdfPath}-page${currentPageIndex + 1}-image${imgIndex + 1}.${ext}`;
      await invoke("pdf_save_extracted_image", {
        request: {
          page_index: currentPageIndex,
          object_index: objectIndex,
          output_path: outputPath,
          format: ext,
        },
      });
      setExportStatus(`Saved image to ${outputPath}`);
    } catch (err) {
      setError(`Save image failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  }, [pdfPath, currentPageIndex, imagesSaveFormat, isExporting, waitForNextPaint]);

  // ── Save all extracted images ──
  const handleSaveAllImages = useCallback(async () => {
    if (!pdfPath || extractedImages.length === 0 || isExporting) return;
    setIsExporting(true);
    setExportStatus(`Preparing ${extractedImages.length} image exports...`);
    setError("");
    try {
      await waitForNextPaint();
      for (let i = 0; i < extractedImages.length; i++) {
        const img = extractedImages[i];
        const ext = imagesSaveFormat;
        const outputPath = `${pdfPath}-page${currentPageIndex + 1}-image${i + 1}.${ext}`;
        setExportStatus(`Saving image ${i + 1} of ${extractedImages.length}...`);
        await invoke("pdf_save_extracted_image", {
          request: {
            page_index: currentPageIndex,
            object_index: img.object_index,
            output_path: outputPath,
            format: ext,
          },
        });
      }
      setExportStatus(`Saved ${extractedImages.length} image(s) from page ${currentPageIndex + 1}`);
    } catch (err) {
      setError(`Save all images failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  }, [pdfPath, currentPageIndex, extractedImages, imagesSaveFormat, isExporting, waitForNextPaint]);

  // ── Toggle object selection (multi-select) ──
  const toggleObjectSelection = useCallback((idx) => {
    if (hiddenObjectIndices.has(idx)) return;
    setSelectedObjectIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, [hiddenObjectIndices]);

  const handlePageObjectSelection = useCallback((idx) => {
    if (hiddenObjectIndices.has(idx)) return;

    const object = getObjectByIndex(pageObjects, idx);
    const willSelect = !selectedObjectIndices.has(idx);

    if (object && willSelect) {
      setLayerViewMode("objects");

      if (object.object_type === "text") {
        setObjectFilter("text");
      } else if (object.object_type === "image") {
        setObjectFilter("image");
      } else if (SHAPE_OBJECT_TYPES.has(object.object_type)) {
        setObjectFilter("path");
      } else {
        setObjectFilter("all");
      }

      pendingSidebarFocusIdxRef.current = idx;
    }

    toggleObjectSelection(idx);
  }, [hiddenObjectIndices, pageObjects, selectedObjectIndices, toggleObjectSelection]);

  const getVisibilityBundleIndices = useCallback(
    (idx) => getVisibilityBundleIndicesForObjects(pageObjects, idx),
    [pageObjects],
  );

  const toggleGroupSelection = useCallback((memberIndices) => {
    setSelectedObjectIndices((prev) => {
      const next = new Set(prev);
      const selectable = memberIndices.filter((idx) => !hiddenObjectIndices.has(idx));
      if (selectable.length === 0) return next;
      const allSelected = selectable.every((idx) => next.has(idx));
      for (const idx of selectable) {
        if (allSelected) next.delete(idx);
        else next.add(idx);
      }
      return next;
    });
  }, [hiddenObjectIndices]);

  const toggleGroupVisibility = useCallback((memberIndices) => {
    setHiddenObjectIndices((prev) => {
      const next = new Set(prev);
      const shouldShow = memberIndices.some((idx) => next.has(idx));
      for (const idx of memberIndices) {
        if (shouldShow) next.delete(idx);
        else next.add(idx);
      }
      return next;
    });

    setSelectedObjectIndices((prev) => {
      const next = new Set(prev);
      for (const idx of memberIndices) {
        next.delete(idx);
      }
      return next;
    });
    setExcludedChildren((prev) => {
      const next = new Set(prev);
      for (const idx of memberIndices) {
        next.delete(idx);
      }
      return next;
    });
    setHoveredObjectIdx((prev) => (memberIndices.includes(prev) ? null : prev));
  }, []);

  // ── Toggle object visibility (eye icon) ──
  const toggleObjectVisibility = useCallback((idx) => {
    const bundleIndices = getVisibilityBundleIndices(idx);
    setHiddenObjectIndices((prev) => {
      const next = new Set(prev);
      const shouldShow = bundleIndices.some((bundleIdx) => next.has(bundleIdx));
      for (const bundleIdx of bundleIndices) {
        if (shouldShow) next.delete(bundleIdx);
        else next.add(bundleIdx);
      }
      return next;
    });

    // Hidden objects should not remain selected/hovered.
    setSelectedObjectIndices((prev) => {
      const next = new Set(prev);
      for (const bundleIdx of bundleIndices) {
        next.delete(bundleIdx);
      }
      return next;
    });
    setExcludedChildren((prev) => {
      const next = new Set(prev);
      for (const bundleIdx of bundleIndices) {
        next.delete(bundleIdx);
      }
      return next;
    });
    setHoveredObjectIdx((prev) => (bundleIndices.includes(prev) ? null : prev));
  }, [getVisibilityBundleIndices]);

  // ── Marquee selection complete: select all exportable objects in the drawn rectangle ──
  const EXPORTABLE_TYPES = new Set(["image", "path", "shading"]);
  const handleMarqueeComplete = useCallback((rectDisplay) => {
    if (!imgRef.current || !pages[currentPageIndex]) return;
    const displayW = imgRef.current.clientWidth;
    const displayH = imgRef.current.clientHeight;
    const pw = pages[currentPageIndex].width;
    const ph = pages[currentPageIndex].height;
    if (!displayW || !displayH || !pw || !ph) return;

    const scaleX = displayW / pw;
    const scaleY = displayH / ph;
    const pageArea = pw * ph;

    // Convert marquee display rect → PDF coords
    const pdfLeft   = rectDisplay.x / scaleX;
    const pdfRight  = (rectDisplay.x + rectDisplay.w) / scaleX;
    const pdfTop    = ph - (rectDisplay.y / scaleY);
    const pdfBottom = ph - ((rectDisplay.y + rectDisplay.h) / scaleY);

    const selected = new Set();
    for (const obj of pageObjects) {
      if (hiddenObjectIndices.has(obj.index)) continue;
      if (!obj.bounds || !EXPORTABLE_TYPES.has(obj.object_type)) continue;
      const [l, b, r, t] = obj.bounds;
      // Filter out full-page backgrounds
      const areaRatio = ((r - l) * (t - b)) / pageArea;
      if (obj.object_type === "image" && areaRatio > 0.85) continue;
      if (obj.object_type === "path" && areaRatio > 0.7) continue;
      // Check overlap (intersection, not containment)
      if (l < pdfRight && r > pdfLeft && b < pdfTop && t > pdfBottom) {
        selected.add(obj.index);
      }
    }
    if (selected.size > 0) {
      setSelectedObjectIndices(selected);
    }
  }, [pageObjects, pages, currentPageIndex, hiddenObjectIndices]);

  useEffect(() => {
    if (activePanel !== "images" || layerViewMode !== "objects") return;

    const targetIdx = pendingSidebarFocusIdxRef.current;
    if (targetIdx == null || !selectedObjectIndices.has(targetIdx)) return;

    const frameId = requestAnimationFrame(() => {
      const row = objectRowRefs.current.get(targetIdx);
      if (!row) return;
      row.scrollIntoView({ block: "center", behavior: "smooth" });
      pendingSidebarFocusIdxRef.current = null;
    });

    return () => cancelAnimationFrame(frameId);
  }, [activePanel, layerViewMode, objectFilter, selectedObjectIndices, currentPageIndex]);

  // ── Compute union bounding box of selected objects (excludes text) ──
  const getSelectedBounds = useCallback(() => {
    const selected = pageObjects.filter(
      (o) => selectedObjectIndices.has(o.index) && !hiddenObjectIndices.has(o.index) && o.bounds && o.object_type !== "text"
    );
    if (selected.length === 0) return null;
    let [minL, minB, maxR, maxT] = selected[0].bounds;
    for (const obj of selected.slice(1)) {
      const [l, b, r, t] = obj.bounds;
      minL = Math.min(minL, l);
      minB = Math.min(minB, b);
      maxR = Math.max(maxR, r);
      maxT = Math.max(maxT, t);
    }
    return [minL, minB, maxR, maxT];
  }, [pageObjects, selectedObjectIndices, hiddenObjectIndices]);

  const getMergeableSelectedIndices = useCallback(() => {
    return pageObjects
      .filter(
        (obj) => selectedObjectIndices.has(obj.index)
          && !hiddenObjectIndices.has(obj.index)
          && obj.bounds
          && obj.object_type === "path",
      )
      .map((obj) => obj.index)
      .sort((a, b) => a - b);
  }, [pageObjects, selectedObjectIndices, hiddenObjectIndices]);

  const handleMergeSelectedIntoGroup = useCallback(() => {
    const mergeableIndices = getMergeableSelectedIndices();
    if (mergeableIndices.length < 2) return;

    setManualGroupsByPage((prev) => {
      const currentGroups = prev[currentPageIndex] || [];
      const mergeSet = new Set(mergeableIndices);
      const overlappingGroups = currentGroups.filter((group) =>
        group.memberIndices.some((idx) => mergeSet.has(idx)),
      );
      const combinedIndices = Array.from(new Set([
        ...mergeableIndices,
        ...overlappingGroups.flatMap((group) => group.memberIndices),
      ])).sort((a, b) => a - b);
      const remainingGroups = currentGroups.filter((group) =>
        !group.memberIndices.some((idx) => mergeSet.has(idx)),
      );
      const nextGroupCount = remainingGroups.length + 1;
      const nextManualGroup = {
        id: `manual-${currentPageIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: `Manual Group ${nextGroupCount}`,
        memberIndices: combinedIndices,
      };

      const nextManualGroupsByPage = {
        ...prev,
        [currentPageIndex]: [...remainingGroups, nextManualGroup],
      };

      persistManualGroups(pdfPath, nextManualGroupsByPage);

      return nextManualGroupsByPage;
    });

    setLayerViewMode("groups");
    setObjectFilter("path");
    setExportStatus(`Saved manual group for page ${currentPageIndex + 1}`);
  }, [currentPageIndex, getMergeableSelectedIndices, pdfPath]);

  const handleUngroupManualGroup = useCallback((groupId) => {
    setManualGroupsByPage((prev) => {
      const currentGroups = prev[currentPageIndex] || [];
      const nextGroups = currentGroups.filter((group) => group.id !== groupId);
      if (nextGroups.length === 0) {
        const { [currentPageIndex]: _removed, ...rest } = prev;
        persistManualGroups(pdfPath, rest);
        return rest;
      }
      const nextManualGroupsByPage = {
        ...prev,
        [currentPageIndex]: nextGroups,
      };
      persistManualGroups(pdfPath, nextManualGroupsByPage);
      return nextManualGroupsByPage;
    });
    setHoveredGroupIndices(new Set());
    setExportStatus(`Removed saved manual group from page ${currentPageIndex + 1}`);
  }, [currentPageIndex, pdfPath]);

  const getSeparateExportTargets = useCallback(() => {
    const exportableSelected = pageObjects
      .filter(
        (obj) => selectedObjectIndices.has(obj.index)
          && !hiddenObjectIndices.has(obj.index)
          && obj.bounds
          && obj.object_type !== "text",
      )
      .sort((a, b) => a.index - b.index);

    if (exportableSelected.length === 0) return [];

    const selectedSet = new Set(exportableSelected.map((obj) => obj.index));
    const usedIndices = new Set();
    const targets = [];

    for (const group of buildObjectGroups(pageObjects, manualGroupsForPage)) {
      const visibleMemberIndices = group.memberIndices.filter((idx) => !hiddenObjectIndices.has(idx));
      if (visibleMemberIndices.length < 2) continue;

      const selectedMembers = visibleMemberIndices.filter((idx) => selectedSet.has(idx));
      if (selectedMembers.length !== visibleMemberIndices.length) continue;

      const members = exportableSelected.filter((obj) => selectedMembers.includes(obj.index));
      if (members.length === 0) continue;

      let [minL, minB, maxR, maxT] = members[0].bounds;
      for (const member of members.slice(1)) {
        const [l, b, r, t] = member.bounds;
        minL = Math.min(minL, l);
        minB = Math.min(minB, b);
        maxR = Math.max(maxR, r);
        maxT = Math.max(maxT, t);
      }

      for (const idx of selectedMembers) {
        usedIndices.add(idx);
      }

      targets.push({
        label: group.label,
        indices: selectedMembers,
        bounds: [minL, minB, maxR, maxT],
      });
    }

    for (const obj of exportableSelected) {
      if (usedIndices.has(obj.index)) continue;
      targets.push({
        label: obj.object_type === "image"
          ? `Image ${obj.image_width || ""}x${obj.image_height || ""}`.trim()
          : `${obj.object_type} #${obj.index >= 100000 ? obj.index - 100000 + 1 : obj.index}`,
        indices: [obj.index],
        bounds: [...obj.bounds],
      });
    }

    return targets;
  }, [pageObjects, selectedObjectIndices, hiddenObjectIndices, manualGroupsForPage]);

  // ── Export selected region as single image (freeze-proof) ──
  const handleExportSelected = useCallback(async () => {
    if (isExporting) return; // guard: prevent double invocation
    const effectiveSelectedIndices = Array.from(selectedObjectIndices).filter((idx) => !hiddenObjectIndices.has(idx));
    if (effectiveSelectedIndices.length === 0) return;
    const bounds = getSelectedBounds();
    if (!bounds || !pdfPath) return;
    setIsExporting(true);
    setExportStatus("Preparing selection export...");
    setError("");
    const ext = imagesSaveFormat;
    const ts = Date.now();
    const outputPath = `${pdfPath}-page${currentPageIndex + 1}-selected-${ts}.${ext}`;
    try {
      await waitForNextPaint();
      await invoke("pdf_export_selected_region", {
        request: {
          page_index: currentPageIndex,
          bounds,
          output_path: outputPath,
          format: ext,
          hide_text: true,
          transparent_bg: transparentBg,
          selected_object_indices: effectiveSelectedIndices,
        },
      });
      setExportStatus(`Saved selected region to ${outputPath}`);
    } catch (err) {
      setError(`Export selected failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, getSelectedBounds, pdfPath, currentPageIndex, imagesSaveFormat, transparentBg, selectedObjectIndices, hiddenObjectIndices, waitForNextPaint]);

  const handleExportSelectedSeparately = useCallback(async () => {
    if (isExporting || !pdfPath) return;
    const targets = getSeparateExportTargets();
    if (targets.length <= 1) return;

    setIsExporting(true);
    setExportStatus(`Preparing ${targets.length} separate exports...`);
    setError("");

    try {
      await waitForNextPaint();
      const ext = imagesSaveFormat;
      const ts = Date.now();

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const suffix = String(i + 1).padStart(2, "0");
        const outputPath = `${pdfPath}-page${currentPageIndex + 1}-selected-${suffix}-${ts}.${ext}`;
        setExportStatus(`Exporting ${i + 1} of ${targets.length}: ${target.label}`);

        await invoke("pdf_export_selected_region", {
          request: {
            page_index: currentPageIndex,
            bounds: target.bounds,
            output_path: outputPath,
            format: ext,
            hide_text: true,
            transparent_bg: transparentBg,
            selected_object_indices: target.indices,
          },
        });
      }

      setExportStatus(`Saved ${targets.length} separate export(s) from page ${currentPageIndex + 1}`);
    } catch (err) {
      setError(`Separate export failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, pdfPath, getSeparateExportTargets, waitForNextPaint, imagesSaveFormat, currentPageIndex, transparentBg]);

  // ── Toggle excluded child (for nested layer unselection) ──
  const toggleExcludedChild = useCallback((childIndex) => {
    setExcludedChildren((prev) => {
      const next = new Set(prev);
      if (next.has(childIndex)) next.delete(childIndex);
      else next.add(childIndex);
      return next;
    });
  }, []);

  // ── Sidebar Panels ──
  const sidebarPanels = [
    { id: "pages", icon: <IconPages />, label: "Pages" },
    { id: "organize", icon: <IconOrganize />, label: "Organize Pages" },
    { id: "images", icon: <IconImages />, label: "Extract Images" },
    { id: "export", icon: <IconExport />, label: "Export" },
    { id: "info", icon: <IconInfo />, label: "Info" },
  ];

  const filteredLayerObjects = pageObjects.filter((o) => {
    if (objectFilter === "exportable") {
      if (!["image", "path", "shading"].includes(o.object_type)) return false;
    } else if (objectFilter === "path") {
      if (!SHAPE_OBJECT_TYPES.has(o.object_type)) return false;
    } else if (objectFilter !== "all" && o.object_type !== objectFilter) return false;
    if (o.bounds && pages[currentPageIndex]) {
      const [l, b, r, t] = o.bounds;
      const objArea = (r - l) * (t - b);
      const pageArea = pages[currentPageIndex].width * pages[currentPageIndex].height;
      if (o.object_type === "image" && objArea / pageArea > 0.85) return false;
      if (o.object_type === "path" && objArea / pageArea > 0.7) return false;
    }
    return true;
  });

  const objectGroups = buildObjectGroups(pageObjects, manualGroupsForPage)
    .map((group) => ({
      ...group,
      members: group.members.filter((member) => filteredLayerObjects.some((obj) => obj.index === member.index)),
      memberIndices: group.memberIndices.filter((memberIdx) => filteredLayerObjects.some((obj) => obj.index === memberIdx)),
    }))
    .filter((group) => group.members.length >= 2);

  const groupedMemberIndices = new Set(objectGroups.flatMap((group) => group.memberIndices));
  const ungroupedLayerObjects = filteredLayerObjects.filter((obj) => !groupedMemberIndices.has(obj.index));
  const separateExportTargets = getSeparateExportTargets();
  const mergeableSelectedIndices = getMergeableSelectedIndices();

  const renderLayerObjectRow = (obj, nested = false, groupMemberIndices = null) => {
    const isSelected = selectedObjectIndices.has(obj.index);
    const isHidden = hiddenObjectIndices.has(obj.index);
    const selectedBg = obj.object_type === "image" ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" :
      obj.object_type === "text" ? "bg-sky-500/10 ring-1 ring-sky-500/40" :
      obj.object_type === "path" ? "bg-amber-500/10 ring-1 ring-amber-500/40" :
      obj.object_type === "shading" ? "bg-purple-500/10 ring-1 ring-purple-500/40" :
      "bg-slate-700 ring-1 ring-slate-500/40";

    return (
      <div
        key={obj.index}
        ref={(element) => {
          if (nested) return;
          if (element) objectRowRefs.current.set(obj.index, element);
          else objectRowRefs.current.delete(obj.index);
        }}
        onMouseEnter={() => {
          setHoveredGroupIndices(groupMemberIndices ? new Set(groupMemberIndices) : new Set());
          setHoveredObjectIdx(obj.index);
        }}
        onMouseLeave={() => {
          setHoveredObjectIdx(null);
          if (groupMemberIndices) {
            setHoveredGroupIndices(new Set(groupMemberIndices));
          }
        }}
        className={`rounded-lg transition-all duration-150 ${
          isSelected
            ? selectedBg
            : hoveredObjectIdx === obj.index
            ? "bg-slate-800 ring-1 ring-slate-600"
            : "bg-slate-800/30 hover:bg-slate-800/60"
        } ${isHidden ? "opacity-45" : ""}`}
      >
        <div
          className={`flex items-center gap-2.5 cursor-pointer ${nested ? "px-2 py-1.5" : "px-2.5 py-2"}`}
          onClick={() => toggleObjectSelection(obj.index)}
        >
          <span className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? "bg-rose-500 border-rose-500"
              : "border-slate-600 bg-slate-800 hover:border-slate-400"
          }`}>
            {isSelected && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
            obj.object_type === "image" ? "bg-emerald-500/20 text-emerald-400" :
            obj.object_type === "text" ? "bg-sky-500/20 text-sky-400" :
            obj.object_type === "path" ? "bg-amber-500/20 text-amber-400" :
            obj.object_type === "shading" ? "bg-purple-500/20 text-purple-400" :
            "bg-slate-700 text-slate-400"
          }`}>
            {obj.object_type === "image" ? "IMG" :
             obj.object_type === "path" ? "SHP" :
             obj.object_type === "shading" ? "SHD" :
             obj.object_type === "text" ? "TXT" :
             obj.object_type.slice(0, 3).toUpperCase()}
          </span>
          <span className="text-[11px] text-slate-300 truncate flex-1 font-medium">
            {obj.object_type === "image"
              ? `${obj.image_width}×${obj.image_height}px`
              : obj.object_type === "text" && obj.text_content
              ? obj.text_content.slice(0, 35) + (obj.text_content.length > 35 ? "…" : "")
              : `#${obj.index >= 100000 ? obj.index - 100000 + 1 : obj.index}`}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleObjectVisibility(obj.index);
            }}
            title={isHidden ? "Show layer" : "Hide layer"}
            className={`p-1 rounded-md transition-colors shrink-0 ${
              isHidden
                ? "text-slate-600 hover:text-slate-300 hover:bg-slate-700"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
            }`}
          >
            {isHidden ? <IconEyeOff /> : <IconEye />}
          </button>
        </div>
        {isSelected && obj.object_type === "text" && obj.text_content && (
          <div className={`${nested ? "px-2 pb-1.5 pt-0" : "px-2.5 pb-2 pt-0.5"}`}>
            <div className="px-2.5 py-1.5 rounded-md bg-slate-800 text-[10px] text-sky-300/80 select-all cursor-text break-words leading-relaxed border border-sky-500/10">
              {obj.text_content}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-300 font-sans overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 h-12 bg-slate-900 border-b border-slate-800 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Back to Home"
        >
          <IconBack />
        </button>

        <div className="w-px h-5 bg-slate-700" />

        <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-sm font-semibold text-slate-200 truncate">
          {fileName || "PDF Editor"}
        </span>

        {isLoaded && (
          <span className="text-xs text-slate-500 ml-1">
            — {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        )}

        <div className="flex-1" />

        {/* File actions */}
        <button
          onClick={handleOpenPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 transition-colors"
        >
          <IconFile />
          Open PDF
        </button>
        {isLoaded && (
          <button
            onClick={handleClosePdf}
            className="flex items-center px-3 py-1.5 text-xs font-medium rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* ── Main Area ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Canvas Area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Page Canvas */}
          <div ref={canvasRef} className="flex-1 relative overflow-auto bg-slate-950">
            {/* Checkered / dark background pattern */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(100,116,139,0.08) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />

            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px]">
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl">
                  <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-slate-300">Rendering...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400 max-w-md text-center">
                {error}
              </div>
            )}

            {/* Empty state — before PDF is loaded */}
            {!isLoaded && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-5">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800">
                    <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">No document open</p>
                    <p className="text-slate-600 text-xs mt-1">
                      Open a PDF file to start editing
                    </p>
                  </div>
                  <button
                    onClick={handleOpenPdf}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/20 transition-all active:scale-[0.97]"
                  >
                    <IconFile />
                    Open PDF File
                  </button>
                </div>
              </div>
            )}

            {/* Organize Pages grid view — replaces rendered page when in organize mode */}
            {isLoaded && activePanel === "organize" && (
              <div className="absolute inset-0 overflow-auto p-6 z-[5]">
                <div className="max-w-5xl mx-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-semibold text-slate-300">
                      Organize Pages ({pages.length})
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddImageAsPage(pages.length)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/15 transition-all active:scale-[0.97]"
                      >
                        <IconImageAdd /> Add Image as Page
                      </button>
                      <button
                        onClick={() => handleInsertBlankPage(pages.length)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 transition-colors"
                      >
                        <IconPlus /> Add Blank Page
                      </button>
                    </div>
                  </div>

                  {/* Page grid */}
                  <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pages.map((page, idx) => (
                      <div
                        key={idx}
                        data-page-idx={idx}
                        onPointerDown={(e) => onDragPointerDown(e, idx)}
                        className={`group relative rounded-xl border transition-all select-none ${
                          dragState.active && dragState.fromIdx === idx
                            ? "opacity-40 scale-95 border-slate-600 bg-slate-900/40"
                            : dragState.active && dragState.overIdx === idx
                            ? "border-rose-400 bg-rose-500/10 ring-2 ring-rose-400/30 scale-[1.02]"
                            : currentPageIndex === idx
                            ? "border-rose-500/50 bg-slate-800/80 ring-2 ring-rose-500/20 shadow-lg shadow-rose-500/10"
                            : "border-slate-700/50 bg-slate-900/60 hover:bg-slate-800/60 hover:border-slate-600"
                        } ${dragState.active ? "cursor-grabbing" : "cursor-grab"}`}
                      >
                        {/* Drop indicator label */}
                        {dragState.active && dragState.overIdx === idx && dragState.fromIdx !== null && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 px-2 py-0.5 rounded bg-rose-500 text-[9px] font-bold text-white shadow-lg whitespace-nowrap">
                            Move page {dragState.fromIdx + 1} here
                          </div>
                        )}
                        {/* Page number badge */}
                        <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-slate-900/80 text-[10px] font-semibold text-slate-400 backdrop-blur-sm">
                          {idx + 1}
                        </div>

                        {/* Downloading spinner overlay */}
                        {downloadingPageIdx === idx && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 rounded-xl backdrop-blur-[1px]">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                              <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-[10px] text-emerald-400 font-medium">Saving...</span>
                            </div>
                          </div>
                        )}

                        {/* Thumbnail */}
                        <div
                          className="p-3 pt-7 cursor-pointer"
                          onClick={() => {
                            if (dragState.active) return;
                            setCurrentPageIndex(idx);
                            setActivePanel("pages");
                            renderPage(idx, activeLayers);
                          }}
                        >
                          <div className="relative bg-white/5 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: 140 }}>
                            {thumbnails[idx]?.data ? (
                              <img
                                src={thumbnails[idx].data}
                                alt={`Page ${idx + 1}`}
                                className="max-w-full max-h-44 object-contain"
                                draggable={false}
                              />
                            ) : (
                              <div className="text-slate-600 text-xs py-10">
                                {thumbsLoading ? "..." : "No preview"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Page info */}
                        <div className="px-3 pb-1.5 text-center">
                          <span className="text-[10px] text-slate-500">
                            {Math.round(page.width)} × {Math.round(page.height)} pt
                          </span>
                        </div>

                        {/* Download as image */}
                        <div className="flex items-center justify-center gap-1 px-2 pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
                            {["png", "jpg", "webp"].map((fmt) => (
                              <button
                                key={fmt}
                                onClick={(e) => { e.stopPropagation(); setDownloadFormat(fmt); }}
                                className={`px-1.5 py-0.5 text-[9px] font-bold uppercase transition-colors ${
                                  downloadFormat === fmt
                                    ? "bg-rose-500/20 text-rose-400"
                                    : "text-slate-500 hover:text-slate-300"
                                }`}
                              >
                                {fmt}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadPage(idx, downloadFormat); }}
                            disabled={downloadingPageIdx !== null}
                            title={`Download as ${downloadFormat.toUpperCase()}`}
                            className="p-1 rounded-md hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 disabled:opacity-40 transition-colors"
                          >
                            <IconDownload />
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-center gap-1 px-2 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMovePage(idx, -1); }}
                            disabled={idx === 0}
                            title="Move left"
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <IconArrowUp />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMovePage(idx, 1); }}
                            disabled={idx === pages.length - 1}
                            title="Move right"
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <IconArrowDown />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddImageAsPage(idx + 1); }}
                            title="Insert image after this page"
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-emerald-400 transition-colors"
                          >
                            <IconImageAdd />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleInsertBlankPage(idx + 1); }}
                            title="Insert blank page after"
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            <IconPlus />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePage(idx); }}
                            disabled={pages.length <= 1}
                            title="Delete page"
                            className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Export status toast */}
                  {exportStatus && (
                    <div className="mt-4 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 break-all">
                      {exportStatus}
                    </div>
                  )}
                </div>
              </div>
            )}
            {renderedImage && activePanel !== "organize" && (
              <div
                className="inline-flex items-start justify-center p-8"
                style={{ minHeight: "100%", minWidth: "100%" }}
              >
                <div
                  className="shadow-2xl shadow-black/40 rounded-sm relative shrink-0"
                  style={{
                    width: imgNaturalSize.w ? `${Math.round(imgNaturalSize.w * zoom / 100)}px` : "auto",
                  }}
                >
                  <img
                    ref={imgRef}
                    src={renderedImage}
                    alt={`Page ${currentPageIndex + 1}`}
                    className="block w-full h-auto"
                    draggable={false}
                    onLoad={(e) => {
                      setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
                    }}
                  />
                  {/* Selectable text layer */}
                  {activePanel === "images" && showObjectOverlay && pageObjects.length > 0 && pages[currentPageIndex] && imgRef.current && (
                    <TextLayer
                      textBlocks={pageObjects.filter((o) => o.object_type === "text" && !hiddenObjectIndices.has(o.index))}
                      pdfWidth={pages[currentPageIndex].width}
                      pdfHeight={pages[currentPageIndex].height}
                      imgEl={imgRef.current}
                    />
                  )}
                  {/* Bounding box overlay for non-text objects */}
                  {activePanel === "images" && showObjectOverlay && pageObjects.length > 0 && pages[currentPageIndex] && imgRef.current && (
                    <ObjectOverlay
                      pageObjects={pageObjects}
                      pdfWidth={pages[currentPageIndex].width}
                      pdfHeight={pages[currentPageIndex].height}
                      imgEl={imgRef.current}
                      imgNaturalSize={imgNaturalSize}
                      hoveredIdx={hoveredObjectIdx}
                      highlightedIndices={hoveredGroupIndices}
                      selectedIndices={selectedObjectIndices}
                      onHover={setHoveredObjectIdx}
                      onSelect={handlePageObjectSelection}
                      hiddenIndices={hiddenObjectIndices}
                      filter={objectFilter}
                      marqueeActive={marqueeActive}
                      marqueeStart={marqueeStart}
                      marqueeEnd={marqueeEnd}
                      onMarqueeStart={(pos) => {
                        setMarqueeActive(true);
                        setMarqueeStart(pos);
                        setMarqueeEnd(pos);
                      }}
                      onMarqueeMove={(pos) => {
                        setMarqueeEnd(pos);
                      }}
                      onMarqueeEnd={() => {
                        if (marqueeStart && marqueeEnd) {
                          const mx = Math.min(marqueeStart.x, marqueeEnd.x);
                          const my = Math.min(marqueeStart.y, marqueeEnd.y);
                          const mw = Math.abs(marqueeEnd.x - marqueeStart.x);
                          const mh = Math.abs(marqueeEnd.y - marqueeStart.y);
                          if (mw > 5 && mh > 5) {
                            handleMarqueeComplete({ x: mx, y: my, w: mw, h: mh });
                            setObjectFilter("exportable");
                          }
                        }
                        setMarqueeActive(false);
                        setMarqueeStart(null);
                        setMarqueeEnd(null);
                      }}
                    />
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ── Bottom Toolbar (zoom + page nav) ── */}
          {isLoaded && (
            <div className="flex items-center justify-between px-4 h-10 bg-slate-900 border-t border-slate-800 shrink-0">
              {/* Page navigation */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPageIndex === 0}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <IconChevronLeft />
                </button>
                <span className="text-xs text-slate-400 tabular-nums min-w-[60px] text-center">
                  {currentPageIndex + 1} / {pages.length}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPageIndex >= pages.length - 1}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <IconChevronRight />
                </button>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1.5">
                <button onClick={zoomOut} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                  <IconZoomOut />
                </button>
                <button
                  onClick={zoomFit}
                  className="text-xs text-slate-400 hover:text-slate-200 tabular-nums min-w-[40px] text-center px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
                >
                  {zoom}%
                </button>
                <button onClick={zoomIn} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                  <IconZoomIn />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        {isLoaded && (
          <div className="flex shrink-0">
            {/* Tab buttons */}
            <div className="flex flex-col items-center w-11 bg-slate-900 border-l border-slate-800 pt-2 gap-1">
              {sidebarPanels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => setActivePanel(panel.id)}
                  title={panel.label}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                    activePanel === panel.id
                      ? "bg-slate-800 text-rose-400"
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  {panel.icon}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="w-72 bg-slate-900/80 border-l border-slate-800/80 overflow-y-auto">
              <div className="p-3 space-y-3">
                {/* ── Pages Panel ── */}
                {activePanel === "pages" && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Pages ({pages.length})
                      </h3>
                      <button
                        onClick={() => handleInsertBlankPage(pages.length)}
                        title="Add blank page at end"
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <IconPlus /> Add
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
                      {pages.map((page, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setCurrentPageIndex(idx);
                            renderPage(idx, activeLayers);
                          }}
                          className={`group relative rounded-lg border cursor-pointer transition-all ${
                            currentPageIndex === idx
                              ? "border-rose-500/50 bg-slate-800 ring-1 ring-rose-500/20"
                              : "border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600"
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="p-2">
                            <div className="relative bg-white/5 rounded overflow-hidden flex items-center justify-center" style={{ minHeight: 80 }}>
                              {thumbnails[idx]?.data ? (
                                <img
                                  src={thumbnails[idx].data}
                                  alt={`Page ${idx + 1}`}
                                  className="max-w-full max-h-28 object-contain"
                                  draggable={false}
                                />
                              ) : (
                                <div className="text-slate-600 text-xs py-6">
                                  {thumbsLoading ? "..." : "No preview"}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Page label & controls */}
                          <div className="flex items-center justify-between px-2 pb-2">
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              Page {idx + 1}
                            </span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMovePage(idx, -1); }}
                                disabled={idx === 0}
                                title="Move up"
                                className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >
                                <IconArrowUp />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMovePage(idx, 1); }}
                                disabled={idx === pages.length - 1}
                                title="Move down"
                                className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >
                                <IconArrowDown />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleInsertBlankPage(idx + 1); }}
                                title="Insert blank page after"
                                className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                <IconPlus />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeletePage(idx); }}
                                disabled={pages.length <= 1}
                                title="Delete page"
                                className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Organize Pages Panel ── */}
                {activePanel === "organize" && (
                  <>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Organize Pages
                    </h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Rearrange, add, or remove pages. Click a thumbnail in the grid to view it.
                    </p>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleAddImageAsPage(pages.length)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white transition-all active:scale-[0.97] shadow-lg shadow-rose-500/15"
                      >
                        <IconImageAdd /> Add Image as Page
                      </button>
                      <button
                        onClick={() => handleInsertBlankPage(pages.length)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all active:scale-[0.97]"
                      >
                        <IconPlus /> Add Blank Page
                      </button>
                    </div>

                    <div className="border-t border-slate-800 pt-3" />

                    {/* Compact page list in sidebar */}
                    <div className="space-y-1.5 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
                      {pages.map((page, idx) => (
                        <div
                          key={idx}
                          className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                            currentPageIndex === idx
                              ? "bg-slate-800 border border-rose-500/40 ring-1 ring-rose-500/20"
                              : "bg-slate-800/30 border border-transparent hover:bg-slate-800/60 hover:border-slate-700"
                          }`}
                          onClick={() => {
                            setCurrentPageIndex(idx);
                            setActivePanel("pages");
                            renderPage(idx, activeLayers);
                          }}
                        >
                          {/* Mini thumbnail */}
                          <div className="w-8 h-10 bg-white/5 rounded overflow-hidden flex items-center justify-center shrink-0">
                            {thumbnails[idx]?.data ? (
                              <img src={thumbnails[idx].data} alt="" className="max-w-full max-h-full object-contain" draggable={false} />
                            ) : (
                              <span className="text-[8px] text-slate-600">{idx + 1}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] text-slate-400">Page {idx + 1}</span>
                            <div className="text-[9px] text-slate-600">{Math.round(page.width)}×{Math.round(page.height)}</div>
                          </div>
                          {/* Quick actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMovePage(idx, -1); }}
                              disabled={idx === 0}
                              title="Move up"
                              className="p-0.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-colors"
                            >
                              <IconArrowUp />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMovePage(idx, 1); }}
                              disabled={idx === pages.length - 1}
                              title="Move down"
                              className="p-0.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-colors"
                            >
                              <IconArrowDown />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePage(idx); }}
                              disabled={pages.length <= 1}
                              title="Delete"
                              className="p-0.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 disabled:opacity-20 transition-colors"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Extract Images Panel ── */}
                {activePanel === "images" && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <IconLayers />
                        Layers — Page {currentPageIndex + 1}
                      </h3>
                      <button
                        onClick={() => fetchPageObjects(currentPageIndex)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-all"
                      >
                        Refresh
                      </button>
                    </div>

                    {/* Overlay toggle + filter */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={showObjectOverlay}
                          onChange={(e) => setShowObjectOverlay(e.target.checked)}
                          className="rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-rose-500/30 w-4 h-4"
                        />
                        <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">Show bounding boxes on page</span>
                      </label>

                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { key: "all", label: "All", active: "bg-slate-700 text-slate-200 ring-1 ring-slate-500" },
                          { key: "image", label: "Images", active: "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40" },
                          { key: "text", label: "Text", active: "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40" },
                          { key: "path", label: "Shapes", active: "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40" },
                          { key: "exportable", label: "Draw", active: "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40" },
                        ].map((f) => (
                          <button
                            key={f.key}
                            onClick={() => setObjectFilter(f.key)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                              objectFilter === f.key
                                ? f.active
                                : "bg-slate-800/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLayerViewMode("objects")}
                          className={`flex-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                            layerViewMode === "objects"
                              ? "bg-slate-700 text-slate-200 ring-1 ring-slate-500"
                              : "bg-slate-800/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          Objects
                        </button>
                        <button
                          type="button"
                          onClick={() => setLayerViewMode("groups")}
                          className={`flex-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                            layerViewMode === "groups"
                              ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                              : "bg-slate-800/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          Groups
                        </button>
                      </div>

                      {/* Object summary — pill badges */}
                      {pageObjects.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-medium text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {pageObjects.filter((o) => o.object_type === "image").length} images
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-[10px] font-medium text-sky-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                            {pageObjects.filter((o) => o.object_type === "text").length} text
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] font-medium text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {pageObjects.filter((o) => SHAPE_OBJECT_TYPES.has(o.object_type)).length} shapes
                          </span>
                        </div>
                      )}

                      {/* Marquee draw hint for exportable mode */}
                      {objectFilter === "exportable" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-rose-500/10 to-orange-500/10 border border-rose-500/20">
                          <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                          </svg>
                          <span className="text-[11px] text-rose-300/90 leading-relaxed font-medium">Draw a rectangle on the page to auto-select objects in that area</span>
                        </div>
                      )}
                    </div>

                    {/* Object list — click to multi-select */}
                    {pageObjects.length > 0 && (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {layerViewMode === "objects" ? (
                          filteredLayerObjects.map((obj) => renderLayerObjectRow(obj))
                        ) : (
                          <div className="space-y-2">
                            {objectGroups.map((group) => {
                              const selectableMembers = group.memberIndices.filter((idx) => !hiddenObjectIndices.has(idx));
                              const selectedCount = selectableMembers.filter((idx) => selectedObjectIndices.has(idx)).length;
                              const allSelected = selectableMembers.length > 0 && selectedCount === selectableMembers.length;
                              const partiallySelected = selectedCount > 0 && selectedCount < selectableMembers.length;
                              const allHidden = group.memberIndices.every((idx) => hiddenObjectIndices.has(idx));
                              return (
                                <div
                                  key={group.id}
                                  onMouseEnter={() => {
                                    setHoveredObjectIdx(null);
                                    setHoveredGroupIndices(new Set(group.memberIndices));
                                  }}
                                  onMouseLeave={() => setHoveredGroupIndices(new Set())}
                                  className={`rounded-xl border overflow-hidden ${allHidden ? "border-slate-800 bg-slate-900/30 opacity-60" : "border-slate-700/60 bg-slate-900/40 shadow-[0_12px_30px_rgba(15,23,42,0.18)]"}`}
                                >
                                  <div
                                    className="px-2.5 py-2.5 cursor-pointer"
                                    onClick={() => toggleGroupSelection(group.memberIndices)}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2 min-w-0 flex-1">
                                        <span className={`mt-0.5 w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                          allSelected || partiallySelected
                                            ? "bg-rose-500 border-rose-500"
                                            : "border-slate-600 bg-slate-800 hover:border-slate-400"
                                        }`}>
                                          {allSelected ? (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                          ) : partiallySelected ? (
                                            <span className="w-2 h-0.5 rounded-full bg-white" />
                                          ) : null}
                                        </span>
                                        <div className="min-w-0 flex-1 space-y-1">
                                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 bg-amber-500/20 text-amber-300">
                                              GRP
                                            </span>
                                            {group.isManual && (
                                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 bg-cyan-500/15 text-cyan-300">
                                                Manual
                                              </span>
                                            )}
                                            <span className="text-[11px] text-slate-200 truncate font-semibold min-w-0">
                                              {group.label}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            {group.memberIndices.length} layer{group.memberIndices.length !== 1 ? "s" : ""}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {group.isManual && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleUngroupManualGroup(group.id);
                                            }}
                                            title="Remove manual group"
                                            className="px-2 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wider text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 border border-cyan-500/15 transition-colors"
                                          >
                                            Ungroup
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleGroupVisibility(group.memberIndices);
                                          }}
                                          title={allHidden ? "Show group" : "Hide group"}
                                          className={`p-1.5 rounded-md transition-colors shrink-0 ${
                                            allHidden
                                              ? "text-slate-600 hover:text-slate-300 hover:bg-slate-700"
                                              : "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                                          }`}
                                        >
                                          {allHidden ? <IconEyeOff /> : <IconEye />}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="px-2.5 pb-2.5 space-y-1">
                                    {group.members.map((member) => renderLayerObjectRow(member, true, group.memberIndices))}
                                  </div>
                                </div>
                              );
                            })}
                            {ungroupedLayerObjects.length > 0 && (
                              <div className="space-y-1.5 border-t border-slate-800 pt-2">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-1">
                                  Ungrouped Layers
                                </div>
                                {ungroupedLayerObjects.map((obj) => renderLayerObjectRow(obj))}
                              </div>
                            )}
                            {objectGroups.length === 0 && (
                              <p className="text-[10px] text-slate-600 italic px-1">No groups detected for the current filter.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selection info + actions */}
                    {selectedObjectIndices.size > 0 && (
                      <div className="space-y-3 border-t border-slate-700/50 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                            {selectedObjectIndices.size} object{selectedObjectIndices.size !== 1 ? "s" : ""} selected
                          </span>
                          <button
                            onClick={() => { setSelectedObjectIndices(new Set()); setExcludedChildren(new Set()); }}
                            className="text-[10px] text-slate-500 hover:text-rose-400 font-medium transition-colors px-2 py-0.5 rounded hover:bg-rose-500/10"
                          >
                            Clear all
                          </button>
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-800/90 bg-slate-900/55 px-3 py-3">
                          {mergeableSelectedIndices.length > 1 && (
                            <button
                              type="button"
                              onClick={handleMergeSelectedIntoGroup}
                              className="w-full px-3 py-2.5 rounded-xl text-[11px] font-semibold leading-snug bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/15 hover:border-cyan-400/40 transition-all active:scale-[0.97]"
                            >
                                Merge {mergeableSelectedIndices.length} Selected Paths Into One Group
                            </button>
                          )}

                          {/* Nested layer tree for selected group objects */}
                          {(() => {
                          const selectedWithChildren = pageObjects.filter(
                            (o) => selectedObjectIndices.has(o.index) && o.children && o.children.length > 0
                          );
                          if (selectedWithChildren.length === 0) return null;
                          return (
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-slate-500 font-medium">Inner Layers</span>
                              {selectedWithChildren.map((parent) => (
                                <div key={parent.index} className="pl-1 border-l border-slate-700 space-y-0.5">
                                  <div className="text-[10px] text-slate-400 font-medium pl-1">
                                    {parent.object_type} #{parent.index} — {parent.children.length} children
                                  </div>
                                  {parent.children.map((childIdx) => {
                                    const child = pageObjects.find((o) => o.index === childIdx);
                                    if (!child) return null;
                                    const isExcluded = excludedChildren.has(childIdx);
                                    return (
                                      <div
                                        key={childIdx}
                                        onClick={() => toggleExcludedChild(childIdx)}
                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer text-[10px] transition-colors ${
                                          isExcluded
                                            ? "bg-slate-800/30 text-slate-600 line-through"
                                            : "bg-slate-800/60 text-slate-400 hover:bg-slate-700"
                                        }`}
                                      >
                                        <span className={`w-2.5 h-2.5 rounded border flex items-center justify-center shrink-0 ${
                                          isExcluded ? "border-slate-700 bg-slate-800" : "bg-emerald-500 border-emerald-500"
                                        }`}>
                                          {!isExcluded && (
                                            <svg className="w-1.5 h-1.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                          )}
                                        </span>
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                          child.object_type === "image" ? "bg-emerald-400" :
                                          child.object_type === "text" ? "bg-sky-400" :
                                          child.object_type === "path" ? "bg-amber-400" : "bg-slate-500"
                                        }`} />
                                        <span className="truncate">
                                          {child.object_type === "image"
                                            ? `Image ${child.image_width}×${child.image_height}`
                                            : child.object_type === "text" && child.text_content
                                            ? child.text_content.slice(0, 25) + (child.text_content.length > 25 ? "…" : "")
                                            : `${child.object_type} #${child.index}`}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          );
                          })()}

                          {/* Save format selector */}
                          <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Export format</label>
                          <div className="grid grid-cols-3 gap-1">
                            {["png", "jpg", "webp"].map((fmt) => (
                              <button
                                key={fmt}
                                onClick={() => setImagesSaveFormat(fmt)}
                                className={`py-1 rounded text-[10px] font-semibold uppercase transition-colors ${
                                  imagesSaveFormat === fmt
                                    ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                }`}
                              >
                                {fmt}
                              </button>
                            ))}
                          </div>
                          </div>

                          {/* Background mode selector */}
                          <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Background</label>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => setTransparentBg(true)}
                              className={`py-1.5 rounded text-[10px] font-semibold transition-colors ${
                                transparentBg
                                  ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              Transparent
                            </button>
                            <button
                              type="button"
                              onClick={() => setTransparentBg(false)}
                              className={`py-1.5 rounded text-[10px] font-semibold transition-colors ${
                                !transparentBg
                                  ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              As-is
                            </button>
                          </div>
                          {transparentBg && imagesSaveFormat === "jpg" && (
                            <p className="text-[9px] text-amber-400/70 mt-1">JPEG doesn't support transparency — will export with white background</p>
                          )}
                          </div>

                          {/* Export selected region */}
                          {(() => {
                          const hasExportable = pageObjects.some(
                            (o) => selectedObjectIndices.has(o.index) && !hiddenObjectIndices.has(o.index) && o.bounds && o.object_type !== "text"
                          );
                          return hasExportable ? (
                            <div className="space-y-2">
                              <button
                                onClick={handleExportSelected}
                                disabled={isExporting}
                                className="w-full py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white transition-all active:scale-[0.97] shadow-lg shadow-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isExporting ? "Exporting..." : `Export Combined as ${imagesSaveFormat.toUpperCase()}`}
                              </button>
                              {separateExportTargets.length > 1 && (
                                <button
                                  onClick={handleExportSelectedSeparately}
                                  disabled={isExporting}
                                  className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isExporting ? "Exporting..." : `Export ${separateExportTargets.length} Items Separately`}
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-600 italic">Select images or shapes to export</p>
                          );
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-800 pt-3" />

                    {/* Extract embedded images section */}
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Extract Embedded Images
                    </h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Extract actual embedded image files from the PDF.
                    </p>
                    <button
                      onClick={() => extractImages(currentPageIndex)}
                      disabled={imagesLoading}
                      className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all active:scale-[0.97] disabled:opacity-50"
                    >
                      {imagesLoading ? "Extracting..." : "Extract Images from Page"}
                    </button>

                    {extractedImages.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-slate-500">
                          {extractedImages.length} image{extractedImages.length !== 1 ? "s" : ""} found
                        </p>

                        {/* Save all button */}
                        <button
                          onClick={handleSaveAllImages}
                          className="w-full py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all active:scale-[0.97]"
                        >
                          Save All ({extractedImages.length}) as {imagesSaveFormat.toUpperCase()}
                        </button>

                        {/* Individual images */}
                        <div className="space-y-2 max-h-[calc(100vh-28rem)] overflow-y-auto pr-1">
                          {extractedImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="group relative rounded-lg border border-slate-700/50 bg-slate-800/30 overflow-hidden"
                              onMouseEnter={() => setHoveredObjectIdx(img.object_index)}
                              onMouseLeave={() => setHoveredObjectIdx(null)}
                            >
                              <div className="p-2 bg-white/5 flex items-center justify-center">
                                <img
                                  src={img.data}
                                  alt={`Extracted image ${idx + 1}`}
                                  className="max-w-full max-h-36 object-contain"
                                  draggable={false}
                                />
                              </div>
                              <div className="flex items-center justify-between px-2 py-1.5">
                                <span className="text-[10px] text-slate-500">
                                  Image {idx + 1} — {img.width}×{img.height}px
                                </span>
                                <button
                                  onClick={() => handleSaveExtractedImage(img.object_index, idx)}
                                  title={`Save as ${imagesSaveFormat.toUpperCase()}`}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                                >
                                  <IconDownload /> Save
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {exportStatus && (
                      <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 break-all">
                        {exportStatus}
                      </div>
                    )}
                  </>
                )}

                {/* ── Export Panel ── */}
                {activePanel === "export" && (
                  <>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Export Page as Image
                    </h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Convert the entire page {currentPageIndex + 1} to an image file.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Format</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {["png", "jpg", "webp"].map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => setExportFormat(fmt)}
                              className={`py-1.5 rounded-md text-xs font-semibold uppercase transition-colors ${
                                exportFormat === fmt
                                  ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleExportPage}
                        disabled={isExporting}
                        className="w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white transition-all active:scale-[0.97] shadow-lg shadow-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isExporting ? "Exporting..." : `Export Page ${currentPageIndex + 1} as ${exportFormat.toUpperCase()}`}
                      </button>

                      {exportStatus && (
                        <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 break-all">
                          {exportStatus}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Info Panel ── */}
                {activePanel === "info" && (
                  <>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Document Info
                    </h3>

                    <div className="space-y-3">
                      <InfoRow label="File" value={fileName} />
                      <InfoRow
                        label="Pages"
                        value={metadata?.page_count ?? pages.length}
                      />
                      {pages[currentPageIndex] && (
                        <>
                          <InfoRow
                            label="Current Page"
                            value={`${currentPageIndex + 1}`}
                          />
                          <InfoRow
                            label="Dimensions"
                            value={`${Math.round(pages[currentPageIndex].width)} × ${Math.round(pages[currentPageIndex].height)} pt`}
                          />
                        </>
                      )}
                      <InfoRow
                        label="Path"
                        value={pdfPath}
                        mono
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</dt>
      <dd
        className={`mt-0.5 text-xs text-slate-300 break-all ${mono ? "font-mono text-[11px]" : ""}`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

// Color map for object types
const OBJECT_COLORS = {
  image: { border: "rgba(52, 211, 153, 0.9)", bg: "rgba(52, 211, 153, 0.06)", hoverBg: "rgba(52, 211, 153, 0.22)", label: "#34d399" },
  text:  { border: "rgba(56, 189, 248, 0.6)", bg: "rgba(56, 189, 248, 0.04)", hoverBg: "rgba(56, 189, 248, 0.14)", label: "#38bdf8" },
  path:  { border: "rgba(251, 191, 36, 0.4)", bg: "rgba(251, 191, 36, 0.02)", hoverBg: "rgba(251, 191, 36, 0.08)", label: "#fbbf24" },
  shading: { border: "rgba(168, 85, 247, 0.4)", bg: "rgba(168, 85, 247, 0.02)", hoverBg: "rgba(168, 85, 247, 0.08)", label: "#a855f7" },
  form:  { border: "rgba(244, 114, 182, 0.4)", bg: "rgba(244, 114, 182, 0.02)", hoverBg: "rgba(244, 114, 182, 0.08)", label: "#f472b6" },
};

/**
 * TextLayer — renders invisible but browser-selectable text positioned over the page.
 * Works like PDF.js: text is transparent but can be highlighted/copied by the user.
 */
function TextLayer({ textBlocks, pdfWidth, pdfHeight, imgEl }) {
  const displayW = imgEl.clientWidth;
  const displayH = imgEl.clientHeight;
  if (!displayW || !displayH || !pdfWidth || !pdfHeight) return null;

  const scaleX = displayW / pdfWidth;
  const scaleY = displayH / pdfHeight;

  return (
    <div
      className="absolute inset-0"
      style={{ width: displayW, height: displayH, zIndex: 2, pointerEvents: "none" }}
    >
      {textBlocks.map((obj) => {
        if (!obj.bounds || !obj.text_content) return null;
        const [left, bottom, right, top] = obj.bounds;
        const x = left * scaleX;
        const y = (pdfHeight - top) * scaleY;
        const w = (right - left) * scaleX;
        const h = (top - bottom) * scaleY;
        if (w < 2 || h < 2) return null;

        const fontSize = Math.max(1, h * 0.82);

        return (
          <div
            key={obj.index}
            className="absolute overflow-hidden"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${w}px`,
              height: `${h}px`,
              fontSize: `${fontSize}px`,
              lineHeight: `${h}px`,
              fontFamily: "sans-serif",
              color: "transparent",
              pointerEvents: "auto",
              cursor: "text",
              userSelect: "text",
              WebkitUserSelect: "text",
              whiteSpace: "nowrap",
            }}
          >
            {obj.text_content}
          </div>
        );
      })}
    </div>
  );
}

/**
 * ObjectOverlay — uses hit-testing so ANY overlapping object can be selected.
 * All bounding-box divs are pointer-events:none (visual only).
 * A transparent click layer on top handles clicks: finds all objects whose
 * bounding box contains the click point, picks the smallest one that isn't
 * already selected, and toggles it. This means paths inside images,
 * paths inside paths, shading — everything is selectable.
 */
function ObjectOverlay({
  pageObjects,
  pdfWidth,
  pdfHeight,
  imgEl,
  imgNaturalSize,
  hoveredIdx,
  highlightedIndices,
  selectedIndices,
  onHover,
  onSelect,
  hiddenIndices,
  filter,
  marqueeActive,
  marqueeStart,
  marqueeEnd,
  onMarqueeStart,
  onMarqueeMove,
  onMarqueeEnd,
}) {
  const displayW = imgEl.clientWidth;
  const displayH = imgEl.clientHeight;
  if (!displayW || !displayH || !pdfWidth || !pdfHeight) return null;

  const scaleX = displayW / pdfWidth;
  const scaleY = displayH / pdfHeight;
  const pageArea = pdfWidth * pdfHeight;

  // Apply user filter — include text objects now
  const filtered = pageObjects.filter((obj) => {
    if (!obj.bounds) return false;
    if (hiddenIndices && hiddenIndices.has(obj.index)) return false;
    if (filter === "exportable") {
      if (!["image", "path", "shading"].includes(obj.object_type)) return false;
    } else if (filter === "path") {
      if (!SHAPE_OBJECT_TYPES.has(obj.object_type)) return false;
    } else if (filter !== "all" && obj.object_type !== filter) return false;
    const [l, b, r, t] = obj.bounds;
    const areaRatio = ((r - l) * (t - b)) / pageArea;
    if (obj.object_type === "path" && areaRatio > 0.7) return false;
    if (obj.object_type === "image" && areaRatio > 0.85) return false;
    return true;
  });

  const hitTest = (clickX, clickY) => {
    const hits = [];
    for (const obj of filtered) {
      const [left, bottom, right, top] = obj.bounds;
      const x = left * scaleX;
      const y = (pdfHeight - top) * scaleY;
      const w = (right - left) * scaleX;
      const h = (top - bottom) * scaleY;
      if (clickX >= x && clickX <= x + w && clickY >= y && clickY <= y + h) {
        hits.push({ obj, area: w * h });
      }
    }
    // Sort smallest first — prefer selecting the innermost/smallest object
    hits.sort((a, b) => a.area - b.area);
    return hits.map((h) => h.obj);
  };

  // Click handler: find smallest unselected object under cursor, toggle it
  const handleOverlayClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const hits = hitTest(clickX, clickY);
    if (hits.length === 0) return;

    // If the smallest hit is already selected, deselect it.
    // Otherwise select the smallest unselected hit.
    const smallestUnselected = hits.find((o) => !selectedIndices.has(o.index));
    if (smallestUnselected) {
      onSelect(smallestUnselected.index);
    } else {
      // All hits are selected — deselect the smallest
      onSelect(hits[0].index);
    }
  };

  // Hover handler: highlight the smallest object under cursor
  const handleOverlayMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const hits = hitTest(clickX, clickY);
    if (hits.length > 0) {
      // Prefer smallest unselected, else smallest
      const best = hits.find((o) => !selectedIndices.has(o.index)) || hits[0];
      onHover(best.index);
    } else {
      onHover(null);
    }
  };

  const highlightedGroupObjects = highlightedIndices
    ? filtered.filter((obj) => highlightedIndices.has(obj.index))
    : [];
  const groupHighlightBounds = highlightedGroupObjects.length > 1
    ? highlightedGroupObjects.reduce((acc, obj) => {
        const [left, bottom, right, top] = obj.bounds;
        return [
          Math.min(acc[0], left),
          Math.min(acc[1], bottom),
          Math.max(acc[2], right),
          Math.max(acc[3], top),
        ];
      }, [Infinity, Infinity, -Infinity, -Infinity])
    : null;

  return (
    <div
      className="absolute inset-0"
      style={{ width: displayW, height: displayH, zIndex: 5 }}
    >
      {/* Visual-only bounding boxes — all pointer-events:none */}
      {filtered.map((obj) => {
        const [left, bottom, right, top] = obj.bounds;
        const x = left * scaleX;
        const y = (pdfHeight - top) * scaleY;
        const w = (right - left) * scaleX;
        const h = (top - bottom) * scaleY;
        if (w < 2 || h < 2) return null;

        const colors = OBJECT_COLORS[obj.object_type] || OBJECT_COLORS.path;
        const isHovered = hoveredIdx === obj.index || (highlightedIndices && highlightedIndices.has(obj.index));
        const isSelected = selectedIndices.has(obj.index);
        const isHighlighted = isHovered || isSelected;
        const isImage = obj.object_type === "image";
        const isText = obj.object_type === "text";

        return (
          <div
            key={obj.index}
            className="absolute pointer-events-none transition-all duration-100"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${w}px`,
              height: `${h}px`,
              border: isImage
                ? `${isHighlighted ? 2.5 : 1.5}px ${isSelected ? "solid" : "dashed"} ${colors.border}`
                : isText
                ? `${isHighlighted ? 2 : 1}px ${isSelected ? "solid" : "dashed"} ${colors.border}`
                : `${isHighlighted ? 1.5 : 0.5}px solid ${colors.border}`,
              backgroundColor: isHighlighted ? colors.hoverBg : (isImage ? colors.bg : isText ? colors.bg : "transparent"),
              zIndex: 1,
              boxShadow: isSelected
                ? `0 0 0 2px ${colors.border}, 0 0 16px ${colors.bg}`
                : "none",
              borderRadius: isImage ? "2px" : isText ? "2px" : "0",
            }}
          >

            {/* Selection checkmark */}
            {isSelected && (
              <div
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: colors.border, zIndex: 2 }}
              >
                <svg className="w-2.5 h-2.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            )}
            {/* Hover label */}
            {isHovered && (
              <div
                className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shadow-lg"
                style={{ backgroundColor: colors.border, color: "#0f172a", zIndex: 3 }}
              >
                {isImage ? `${obj.image_width}×${obj.image_height}px`
                  : isText && obj.text_content ? obj.text_content.slice(0, 50) + (obj.text_content.length > 50 ? "…" : "")
                  : `${obj.object_type} #${obj.index}`}
              </div>
            )}
          </div>
        );
      })}

      {groupHighlightBounds && (() => {
        const [left, bottom, right, top] = groupHighlightBounds;
        const x = left * scaleX;
        const y = (pdfHeight - top) * scaleY;
        const w = (right - left) * scaleX;
        const h = (top - bottom) * scaleY;
        if (w < 2 || h < 2) return null;
        return (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${w}px`,
                height: `${h}px`,
                border: "2px dashed rgba(34, 211, 238, 0.98)",
                backgroundColor: "rgba(34, 211, 238, 0.06)",
                boxShadow: "0 0 0 2px rgba(34, 211, 238, 0.18), 0 0 22px rgba(34, 211, 238, 0.18)",
                borderRadius: "6px",
                zIndex: 12,
              }}
            />
            <div
              className="absolute pointer-events-none px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shadow-lg"
              style={{
                left: `${x}px`,
                top: `${Math.max(0, y - 24)}px`,
                backgroundColor: "rgba(34, 211, 238, 0.96)",
                color: "#111827",
                zIndex: 13,
              }}
            >
              Group
            </div>
          </>
        );
      })()}

      {/* Marquee rectangle visualization */}
      {marqueeActive && marqueeStart && marqueeEnd && (() => {
        const mx = Math.min(marqueeStart.x, marqueeEnd.x);
        const my = Math.min(marqueeStart.y, marqueeEnd.y);
        const mw = Math.abs(marqueeEnd.x - marqueeStart.x);
        const mh = Math.abs(marqueeEnd.y - marqueeStart.y);
        if (mw < 3 && mh < 3) return null;
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${mx}px`,
              top: `${my}px`,
              width: `${mw}px`,
              height: `${mh}px`,
              border: "2px dashed rgba(244, 63, 94, 0.8)",
              backgroundColor: "rgba(244, 63, 94, 0.08)",
              zIndex: 15,
              borderRadius: "2px",
            }}
          />
        );
      })()}

      {/* Transparent interactive layer — handles clicks + marquee draw */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 10, cursor: "crosshair" }}
        onClick={(e) => {
          // Suppress click if a marquee drag just happened
          if (e.currentTarget._wasMarqueeDrag) {
            e.currentTarget._wasMarqueeDrag = false;
            return;
          }
          handleOverlayClick(e);
        }}
        onMouseMove={(e) => {
          if (marqueeActive && onMarqueeMove) {
            const rect = e.currentTarget.getBoundingClientRect();
            onMarqueeMove({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          } else {
            handleOverlayMove(e);
          }
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if (onMarqueeStart) {
            const rect = e.currentTarget.getBoundingClientRect();
            onMarqueeStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }}
        onMouseUp={(e) => {
          if (marqueeActive && marqueeStart && marqueeEnd) {
            const mw = Math.abs(marqueeEnd.x - marqueeStart.x);
            const mh = Math.abs(marqueeEnd.y - marqueeStart.y);
            if (mw > 5 || mh > 5) {
              // This was a real marquee drag — flag to suppress the upcoming click
              e.currentTarget._wasMarqueeDrag = true;
            }
          }
          if (marqueeActive && onMarqueeEnd) {
            onMarqueeEnd();
          }
        }}
        onMouseLeave={() => {
          onHover(null);
          if (marqueeActive && onMarqueeEnd) {
            onMarqueeEnd();
          }
        }}
      />
    </div>
  );
}

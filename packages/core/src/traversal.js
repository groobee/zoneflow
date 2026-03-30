export function walkZonesDepthFirst(model, zoneId, visit) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return;
    visit(zone);
    for (const childId of zone.childZoneIds) {
        walkZonesDepthFirst(model, childId, visit);
    }
}
export function flattenSubtree(model, zoneId) {
    const result = [];
    walkZonesDepthFirst(model, zoneId, (zone) => {
        result.push(zone);
    });
    return result;
}
export function computeAutoLayoutForZoneTree(model, zoneId, options = {}) {
    const { paddingX = 32, paddingY = 24, verticalGap = 24, defaultWidth = 160, defaultHeight = 100, } = options;
    const zone = model.zonesById[zoneId];
    if (!zone)
        return undefined;
    const childLayouts = zone.childZoneIds
        .map((childId) => computeAutoLayoutForZoneTree(model, childId, options))
        .filter((layout) => Boolean(layout));
    const ownWidth = zone.layout?.width ?? defaultWidth;
    const ownHeight = zone.layout?.height ?? defaultHeight;
    if (childLayouts.length === 0) {
        return {
            x: zone.layout?.x ?? 0,
            y: zone.layout?.y ?? 0,
            z: zone.layout?.z,
            width: ownWidth,
            height: ownHeight,
        };
    }
    const minChildX = Math.min(...childLayouts.map((layout) => layout.x));
    const minChildY = Math.min(...childLayouts.map((layout) => layout.y));
    const maxChildX = Math.max(...childLayouts.map((layout) => layout.x + (layout.width ?? defaultWidth)));
    const maxChildY = Math.max(...childLayouts.map((layout) => layout.y + (layout.height ?? defaultHeight)));
    const width = Math.max(maxChildX - minChildX + paddingX * 2, ownWidth);
    const height = Math.max(ownHeight + verticalGap + (maxChildY - minChildY) + paddingY * 2, ownHeight);
    return {
        x: zone.layout?.x ?? minChildX - paddingX,
        y: zone.layout?.y ?? minChildY - (ownHeight + verticalGap / 2),
        z: zone.layout?.z,
        width,
        height,
    };
}

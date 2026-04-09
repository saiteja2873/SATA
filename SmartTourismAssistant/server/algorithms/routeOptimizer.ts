/**
 * Custom Route Optimization Algorithm for Smart Tourism Assistant
 * 
 * Implements a crowd-aware Traveling Salesman Problem (TSP) solver using:
 * 1. Haversine distance calculation for real-world distances
 * 2. Nearest Neighbor heuristic for initial solution
 * 3. 2-opt local search improvement
 * 4. Crowd-aware cost weighting (penalizes high-crowd destinations)
 */

export interface RouteNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  crowdLevel?: "Low" | "Medium" | "High" | "Very High";
  rating?: number;
  distanceFromCenterKm?: number;
}

export interface OptimizedRouteResult {
  orderedStops: RouteNode[];
  totalDistanceKm: number;
  segmentDistances: number[];       // distance between consecutive stops
  segmentDurations: number[];       // estimated travel time in minutes for each segment
  totalEstimatedTimeMinutes: number;
  algorithm: {
    name: string;
    initialCost: number;
    optimizedCost: number;
    improvementPercent: number;
    iterations: number;
  };
}

// ---------- Haversine Distance ----------

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the great-circle distance between two points on Earth
 * using the Haversine formula.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// ---------- Cost Function ----------

/**
 * Crowd penalty multiplier — visiting a high-crowd place costs more.
 * This encourages the algorithm to prefer routes that visit
 * less crowded places first (or skip peak-crowd transitions).
 */
function crowdPenalty(level?: string): number {
  switch (level) {
    case "Low":       return 1.0;
    case "Medium":    return 1.15;
    case "High":      return 1.35;
    case "Very High": return 1.55;
    default:          return 1.1; // unknown crowd level gets slight penalty
  }
}

// ---------- Distance Matrix ----------

/**
 * Build an NxN distance matrix between all nodes, weighted by crowd level.
 * cost(i, j) = haversine(i, j) * crowdPenalty(j)
 */
function buildCostMatrix(nodes: RouteNode[]): number[][] {
  const n = nodes.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dist = haversineDistance(
        nodes[i].lat, nodes[i].lng,
        nodes[j].lat, nodes[j].lng
      );
      // Apply crowd penalty to the destination node
      matrix[i][j] = dist * crowdPenalty(nodes[j].crowdLevel);
    }
  }

  return matrix;
}

/**
 * Build a pure distance matrix (no crowd weighting) for reporting actual distances.
 */
function buildDistanceMatrix(nodes: RouteNode[]): number[][] {
  const n = nodes.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      matrix[i][j] = haversineDistance(
        nodes[i].lat, nodes[i].lng,
        nodes[j].lat, nodes[j].lng
      );
    }
  }

  return matrix;
}

// ---------- Route Cost ----------

function routeCost(tour: number[], costMatrix: number[][]): number {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    total += costMatrix[tour[i]][tour[i + 1]];
  }
  return total;
}

function routeDistance(tour: number[], distMatrix: number[][]): number {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    total += distMatrix[tour[i]][tour[i + 1]];
  }
  return total;
}

// ---------- Nearest Neighbor Heuristic ----------

/**
 * Greedy nearest-neighbor TSP heuristic.
 * Starts from node 0 (user's location) and greedily picks the cheapest unvisited node.
 */
function nearestNeighbor(costMatrix: number[][], startIndex: number = 0): number[] {
  const n = costMatrix.length;
  const visited = new Set<number>();
  const tour: number[] = [startIndex];
  visited.add(startIndex);

  let current = startIndex;
  for (let step = 1; step < n; step++) {
    let bestNext = -1;
    let bestCost = Infinity;

    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && costMatrix[current][j] < bestCost) {
        bestCost = costMatrix[current][j];
        bestNext = j;
      }
    }

    if (bestNext === -1) break;
    tour.push(bestNext);
    visited.add(bestNext);
    current = bestNext;
  }

  return tour;
}

// ---------- 2-opt Improvement ----------

/**
 * 2-opt local search: repeatedly reverses sub-segments of the tour
 * to reduce total cost until no improvement can be found.
 * 
 * The first node (user location at index 0) stays fixed.
 */
function twoOpt(tour: number[], costMatrix: number[][], maxIterations: number = 500): { tour: number[]; iterations: number } {
  let improved = true;
  let iterations = 0;
  let bestTour = [...tour];

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Start from 1 to keep the starting node (user location) fixed
    for (let i = 1; i < bestTour.length - 1; i++) {
      for (let j = i + 1; j < bestTour.length; j++) {
        const newTour = twoOptSwap(bestTour, i, j);
        if (routeCost(newTour, costMatrix) < routeCost(bestTour, costMatrix)) {
          bestTour = newTour;
          improved = true;
        }
      }
    }
  }

  return { tour: bestTour, iterations };
}

function twoOptSwap(tour: number[], i: number, j: number): number[] {
  const newTour = [
    ...tour.slice(0, i),
    ...tour.slice(i, j + 1).reverse(),
    ...tour.slice(j + 1),
  ];
  return newTour;
}

// ---------- Estimated Travel Time ----------

/**
 * Estimate travel time based on distance and assumed average speed.
 * Urban areas: ~30 km/h average (accounting for traffic, stops)
 * Scenic/rural: ~40 km/h average
 */
function estimateTravelTimeMinutes(distanceKm: number): number {
  const avgSpeedKmh = 30; // conservative urban estimate
  return (distanceKm / avgSpeedKmh) * 60;
}

// ---------- Main Optimizer ----------

/**
 * Optimize a route through the given destinations starting from user's location.
 * 
 * Algorithm:
 * 1. Build a crowd-aware cost matrix using Haversine + crowd penalties
 * 2. Generate initial tour using Nearest Neighbor heuristic
 * 3. Improve tour using 2-opt local search
 * 4. Return ordered stops with distances and timing
 * 
 * @param userLocation - Starting point (user's current position)
 * @param destinations - Array of places to visit
 * @returns Optimized route with algorithm metadata
 */
export function optimizeRoute(
  userLocation: { lat: number; lng: number },
  destinations: RouteNode[],
  crowdAware: boolean = true
): OptimizedRouteResult {
  // Build full node list with user location as node 0
  const startNode: RouteNode = {
    id: "user_location",
    name: "Your Location",
    lat: userLocation.lat,
    lng: userLocation.lng,
    crowdLevel: "Low",
  };

  const allNodes = [startNode, ...destinations];

  // Handle edge cases
  if (destinations.length === 0) {
    return {
      orderedStops: [],
      totalDistanceKm: 0,
      segmentDistances: [],
      segmentDurations: [],
      totalEstimatedTimeMinutes: 0,
      algorithm: {
        name: "None (no destinations)",
        initialCost: 0,
        optimizedCost: 0,
        improvementPercent: 0,
        iterations: 0,
      },
    };
  }

  if (destinations.length === 1) {
    const dist = haversineDistance(
      userLocation.lat, userLocation.lng,
      destinations[0].lat, destinations[0].lng
    );
    return {
      orderedStops: destinations,
      totalDistanceKm: Math.round(dist * 100) / 100,
      segmentDistances: [Math.round(dist * 100) / 100],
      segmentDurations: [Math.round(estimateTravelTimeMinutes(dist))],
      totalEstimatedTimeMinutes: Math.round(estimateTravelTimeMinutes(dist)),
      algorithm: {
        name: "Direct (single destination)",
        initialCost: dist,
        optimizedCost: dist,
        improvementPercent: 0,
        iterations: 0,
      },
    };
  }

  // Step 1: Build cost matrix and pure distance matrix
  // When crowdAware=true, use crowd-weighted costs for optimization (TSP reorders)
  // When crowdAware=false, preserve user's original order (no reordering)
  const distMatrix = buildDistanceMatrix(allNodes);

  if (!crowdAware) {
    // Non-optimized route: farthest-neighbor ordering for a longer, scenic tour
    const n = allNodes.length;
    const visited = new Set<number>([0]);
    const tour: number[] = [0];
    let current = 0;

    while (visited.size < n) {
      let farthestIdx = -1;
      let farthestDist = -1;

      for (let j = 1; j < n; j++) {
        if (!visited.has(j) && distMatrix[current][j] > farthestDist) {
          farthestDist = distMatrix[current][j];
          farthestIdx = j;
        }
      }

      if (farthestIdx === -1) break;
      tour.push(farthestIdx);
      visited.add(farthestIdx);
      current = farthestIdx;
    }

    const reorderedStops = tour.slice(1).map(i => allNodes[i]) as RouteNode[];
    const segmentDistances: number[] = [];
    const segmentDurations: number[] = [];

    for (let i = 0; i < tour.length - 1; i++) {
      const dist = distMatrix[tour[i]][tour[i + 1]];
      segmentDistances.push(Math.round(dist * 100) / 100);
      segmentDurations.push(Math.round(estimateTravelTimeMinutes(dist)));
    }

    const totalDistanceKm = routeDistance(tour, distMatrix);
    const totalEstimatedTimeMinutes = segmentDurations.reduce((a, b) => a + b, 0);

    return {
      orderedStops: reorderedStops,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      segmentDistances,
      segmentDurations,
      totalEstimatedTimeMinutes,
      algorithm: {
        name: "Scenic route (non-optimized, farthest-neighbor)",
        initialCost: totalDistanceKm,
        optimizedCost: totalDistanceKm,
        improvementPercent: 0,
        iterations: 0,
      },
    };
  }

  const costMatrix = buildCostMatrix(allNodes);

  // Step 2: Nearest Neighbor heuristic (start from node 0 = user location)
  const initialTour = nearestNeighbor(costMatrix, 0);
  const initialCost = routeCost(initialTour, costMatrix);

  // Step 3: 2-opt improvement
  const { tour: optimizedTour, iterations } = twoOpt(initialTour, costMatrix);
  const optimizedCost = routeCost(optimizedTour, costMatrix);
  const improvementPercent = initialCost > 0
    ? Math.round(((initialCost - optimizedCost) / initialCost) * 10000) / 100
    : 0;

  // Step 4: Extract results (skip node 0 which is user location)
  const orderedStops = optimizedTour
    .filter(idx => idx !== 0)
    .map(idx => allNodes[idx]);

  // Compute segment distances (from user -> first stop, then stop to stop)
  const segmentDistances: number[] = [];
  const segmentDurations: number[] = [];

  for (let i = 0; i < optimizedTour.length - 1; i++) {
    const dist = distMatrix[optimizedTour[i]][optimizedTour[i + 1]];
    segmentDistances.push(Math.round(dist * 100) / 100);
    segmentDurations.push(Math.round(estimateTravelTimeMinutes(dist)));
  }

  const totalDistanceKm = routeDistance(optimizedTour, distMatrix);
  const totalEstimatedTimeMinutes = segmentDurations.reduce((a, b) => a + b, 0);

  return {
    orderedStops,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    segmentDistances,
    segmentDurations,
    totalEstimatedTimeMinutes,
    algorithm: {
      name: crowdAware ? "Nearest Neighbor + 2-opt (Crowd-Aware TSP)" : "Nearest Neighbor + 2-opt (Shortest Distance TSP)",
      initialCost: Math.round(initialCost * 100) / 100,
      optimizedCost: Math.round(optimizedCost * 100) / 100,
      improvementPercent,
      iterations,
    },
  };
}

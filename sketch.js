
// Classes

class Point {
  constructor(x, y, col='white') {
    this.x = x;
    this.y = y;
    this.col = col;
    this.radius = POINT_RADIUS;
  }

  copy() {
    return new Point(this.x, this.y, this.col);
  }

  draw() {
    fill(this.col);
    circle(this.x, this.y, this.radius);
  }
}





// Global Constants

const CANVAS_SIZE = 720;
const POINT_COUNT = 2500
const POINT_RADIUS = 1;
const CENTROID_RADIUS = POINT_RADIUS*8;
const CLUSTER_POINTS_PER_FRAME = POINT_COUNT/30;
const K = 4;
const State = {
  Cluster : 0,
  Reposition : 1,
  Final : 2
};





// Global Variables

let state = State.Cluster;
let points, centroids, clusters;
let toCluster = [ ];






// p5.js Functions

function setup() {
  createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  colorMode(HSB);
  ellipseMode(RADIUS);
  noStroke();

  setupInitialConditions();
}

function mousePressed() {
  if (state === State.Final) {
    setupInitialConditions();
  }
}

function draw() {
  background(0);

  if (state !== State.Final) {
    // Draw cluster lines
    centroids.forEach((centroid, idx) => {
      stroke(centroid.col);
      clusters[idx].forEach(point => {
        line(centroid.x, centroid.y, point.x, point.y);
      });
    });
    noStroke();
    
    // Draw centroids
    for (let centroid of centroids) {
      centroid.draw();
    }
  }

  // Draw data points
  for (let point of points) {
    point.draw();
  }

  // Manage state related actions
  if (state === State.Cluster) {
    clusterPoints();
  } else if (state === State.Reposition) {
    repositionCentroids();
  } else if (state === State.Final) {
    textAlign(CENTER);
    textSize(12);
    fill('yellow');
    text('All done! Click to re-run', CANVAS_SIZE/2, CANVAS_SIZE - 16);
  }
}





// K-Means Functions

function clusterPoints() {
  
  function getAccumulatorByProperty(prop) {
    return (prev, cur) => {
      return prev + cur[prop];
    }
  }
  
  for (let i = 0; i < CLUSTER_POINTS_PER_FRAME; i++) {
    let point = toCluster.pop();
    
    // Find the nearest centroid for the current point
    let distances = centroids.map(centroid => dist(centroid.x, centroid.y, point.x, point.y));
    let nearest = distances.indexOf(Math.min(...distances));

    // Add the point to the given cluster
    clusters[nearest].push(point);

    // If we have clustered all points
    if (toCluster.length === 0) {
      // Update the targets for the centroids to be their new positions
      centroids.forEach((centroid, idx) => {
        centroid.targetX = clusters[idx].reduce(getAccumulatorByProperty('x'), 0) / clusters[idx].length;
        centroid.targetY = clusters[idx].reduce(getAccumulatorByProperty('y'), 0) / clusters[idx].length;
      })

      // If the new target position of all centroids is the same as theri current position,
      // we have completed the clustering process
      let meansHaveConverged = centroids.reduce((prev, cur) => {
        return prev && (cur.x === cur.targetX && cur.y === cur.targetY);
      }, true);
      if (meansHaveConverged) {
        // Color each of the points according to the cluster they belong to
        clusters.forEach((cluster, idx) => {
          cluster.forEach(point => {
            point.col = centroids[idx].col;
            point.col[3] = 1;
          })
        });
        state = State.Final;
      } else {
        // Otherwise, continue as normal
        state = State.Reposition;
      }

      break;
    } 
  }
} 

function repositionCentroids() {

  function lerpt(start, end, amt, thresh) {
    return (abs(start - end) < thresh) ? end : lerp(start, end, amt);
  }
  

  // Move each centroid towards it's new position
  let complete = 0;
  centroids.forEach(centroid => {
    centroid.x = lerpt(centroid.x, centroid.targetX, .1, .1);
    centroid.y = lerpt(centroid.y, centroid.targetY, .1, .1);

    if (centroid.x === centroid.targetX && centroid.y === centroid.targetY) {
      complete++;
    }
  });

  // If all centroids have reached their positions, swtich to clustering again
  if (complete === K) {
    state = State.Cluster;
    toCluster = points.slice();
    clusters = clusters.map(e => [ ]);
  }
}

function setupInitialConditions() {

  function getRandomPointWithinCanvas() {
    let x = random(POINT_RADIUS, CANVAS_SIZE - POINT_RADIUS);
    let y = random(POINT_RADIUS, CANVAS_SIZE - POINT_RADIUS);
    return new Point(x, y);
  }

  function nudge() {
    return random([-1, 1])*randomGaussian(24, 15);
  };

  function withinCanvas(x, y) {
    return (x > POINT_RADIUS && x < CANVAS_SIZE - POINT_RADIUS && y > 0 && y < CANVAS_SIZE - POINT_RADIUS);
  }

  // Generate 5 or so 'blobs' and then put points near them
  let blobPoints = new Array(K).fill(0).map(e => getRandomPointWithinCanvas());

  // Generate a large majority of the points around the 'blob' points
  points = new Array(POINT_COUNT*(9/10)).fill(0).map(e => {
    let blob = random(blobPoints);
    let x = -1;
    let y = -1;
    // Ensure that all of the points are within the canvas
    do {
      let r = random(0, 75);
      let angle = 2*PI*(random(100)/100);
      x = (blob.x + r*cos(angle)) + nudge();
      y = (blob.y - r*sin(angle)) + nudge();
    } while (!withinCanvas(x, y));

    return new Point(x, y);
  });

  // Then scatter some random points around independent of the blobs
  points = points.concat(new Array(POINT_COUNT/10).fill(0).map(e => getRandomPointWithinCanvas()));

  // Pick some random points for the starting centroid positions
  centroids = new Array(K).fill(0).map((e, idx) => {
    let centroid = random(points).copy();
    centroid.col = [ 360*(idx/K), 100, 100, .25 ];
    centroid.radius = CENTROID_RADIUS;
    // Add the extra properties required for tracking
    centroid['targetX'] = centroid.x;
    centroid['targetY'] = centroid.y;
    return centroid;
  });

  clusters = new Array(K).fill(0).map(e => [ ]);
  toCluster = points.slice();

  state = State.Cluster;
}

UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#how-to-approach-a-system-design-interview-question' WHERE id = 'systemdesign:requirements' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#latency-vs-throughput' WHERE id = 'systemdesign:performance' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#load-balancer' WHERE id = 'systemdesign:network' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#application-layer' WHERE id = 'systemdesign:scaling' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#database' WHERE id = 'systemdesign:databases' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#sql-tuning' WHERE id = 'systemdesign:indexes' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#cache' WHERE id = 'systemdesign:cache' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#consistency-patterns' WHERE id = 'systemdesign:consistency' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#sharding' WHERE id = 'systemdesign:sharding' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#asynchronism' WHERE id = 'systemdesign:queues' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#availability-patterns' WHERE id = 'systemdesign:reliability' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#performance-vs-scalability' WHERE id = 'systemdesign:tradeoffs' AND url = 'https://github.com/donnemartin/system-design-primer';
UPDATE chapters SET url = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md#application-layer' WHERE id = 'backend:boundaries' AND url = 'https://github.com/donnemartin/system-design-primer';

UPDATE posts SET url = (
  SELECT chapters.url FROM chapters WHERE chapters.id = posts.chapter_id
)
WHERE chapter_id IN (
  'systemdesign:requirements',
  'systemdesign:performance',
  'systemdesign:network',
  'systemdesign:scaling',
  'systemdesign:databases',
  'systemdesign:indexes',
  'systemdesign:cache',
  'systemdesign:consistency',
  'systemdesign:sharding',
  'systemdesign:queues',
  'systemdesign:reliability',
  'systemdesign:tradeoffs',
  'backend:boundaries'
)
AND url = 'https://github.com/donnemartin/system-design-primer';

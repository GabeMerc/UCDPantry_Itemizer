-- ============================================================
-- UC Davis Pantry — Seed Data
-- Run in Supabase SQL Editor (bypasses RLS as superuser)
-- ============================================================

-- Clear existing data first (safe to re-run)
truncate table recipe_interactions restart identity cascade;
truncate table inventory restart identity cascade;

-- ─── Inventory ────────────────────────────────────────────────────────────────

insert into inventory (name, category, quantity, unit, dietary_tags, date_available) values

-- Produce (in stock)
('Bananas',        'Produce', 30, 'each',      array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Apples',         'Produce', 25, 'each',      array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Oranges',        'Produce', 20, 'each',      array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Baby Carrots',   'Produce', 15, 'bag',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Spinach',        'Produce', 10, 'bag',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Sweet Potatoes', 'Produce', 18, 'lbs',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Yellow Onions',  'Produce', 20, 'lbs',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Garlic',         'Produce',  12, 'head',     array['vegan','vegetarian','gluten-free','dairy-free'], null),

-- Proteins (in stock)
('Canned Black Beans',  'Proteins', 40, 'can',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Canned Chickpeas',    'Proteins', 35, 'can',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Canned Kidney Beans', 'Proteins', 28, 'can',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Peanut Butter',       'Proteins', 20, 'jar',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Canned Tuna',         'Proteins', 30, 'can',    array['gluten-free','dairy-free'],                     null),
('Canned Salmon',       'Proteins', 18, 'can',    array['gluten-free','dairy-free'],                     null),
('Eggs',                'Proteins', 20, 'dozen',  array['vegetarian','gluten-free'],                     null),
('Red Lentils',         'Proteins', 15, 'bag',    array['vegan','vegetarian','gluten-free','dairy-free'], null),

-- Grains (in stock)
('White Rice',        'Grains', 20, '5 lb bag',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Brown Rice',        'Grains', 15, '5 lb bag',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Spaghetti',         'Grains', 25, 'box',        array['vegan','vegetarian','dairy-free'],               null),
('Penne Pasta',       'Grains', 20, 'box',        array['vegan','vegetarian','dairy-free'],               null),
('Rolled Oats',       'Grains', 18, 'container',  array['vegan','vegetarian','dairy-free'],               null),
('Whole Wheat Bread', 'Grains', 12, 'loaf',       array['vegetarian','dairy-free'],                      null),
('Flour Tortillas',   'Grains', 15, 'pack',       array['vegetarian','dairy-free'],                      null),

-- Dairy & Alternatives (in stock)
('Oat Milk',       'Dairy & Alternatives', 20, 'carton', array['vegan','vegetarian','dairy-free'],              null),
('Almond Milk',    'Dairy & Alternatives', 15, 'carton', array['vegan','vegetarian','dairy-free','gluten-free'], null),
('Cheddar Cheese', 'Dairy & Alternatives', 10, 'block',  array['vegetarian','gluten-free'],                     null),
('Greek Yogurt',   'Dairy & Alternatives', 25, 'cup',    array['vegetarian','gluten-free'],                     null),

-- Pantry (in stock)
('Canned Diced Tomatoes', 'Pantry', 30, 'can',     array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Tomato Sauce',          'Pantry', 22, 'jar',     array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Chicken Broth',         'Pantry', 20, 'carton',  array['gluten-free','dairy-free'],                     null),
('Vegetable Broth',       'Pantry', 18, 'carton',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Olive Oil',             'Pantry', 10, 'bottle',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Soy Sauce',             'Pantry', 14, 'bottle',  array['vegan','vegetarian','dairy-free'],               null),

-- Snacks (in stock)
('Granola Bars',    'Snacks', 40, 'bar', array['vegetarian','dairy-free'],                      null),
('Trail Mix',       'Snacks', 20, 'bag', array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Saltine Crackers','Snacks', 15, 'box', array['vegetarian','dairy-free'],                      null),
('Applesauce Cups', 'Snacks', 30, 'cup', array['vegan','vegetarian','gluten-free','dairy-free'], null),

-- Fresh Proteins (in stock)
('Chicken Breast',  'Proteins', 30, 'lbs',   array['gluten-free','dairy-free'], null),
('Ground Beef',     'Proteins', 25, 'lbs',   array['gluten-free','dairy-free'], null),
('Ground Turkey',   'Proteins', 18, 'lbs',   array['gluten-free','dairy-free'], null),
('Bacon',           'Proteins', 12, 'pack',  array['gluten-free','dairy-free'], null),
('Tofu',            'Proteins', 20, 'block', array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Shrimp',          'Proteins', 15, 'bag',   array['gluten-free','dairy-free'], null),

-- More Produce (in stock)
('Bell Peppers',    'Produce', 20, 'each',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Tomatoes',        'Produce', 25, 'each',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Romaine Lettuce', 'Produce', 12, 'head',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Cucumbers',       'Produce', 15, 'each',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Zucchini',        'Produce', 14, 'each',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Mushrooms',       'Produce', 12, 'pack',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Green Beans',     'Produce', 10, 'bag',   array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Potatoes',        'Produce', 20, 'lbs',   array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Lemons',          'Produce', 18, 'each',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Limes',           'Produce', 15, 'each',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Fresh Ginger',    'Produce',  8, 'piece', array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Cilantro',        'Produce', 10, 'bunch', array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Jalapeños',       'Produce', 12, 'each',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Celery',          'Produce', 10, 'bunch', array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Corn on the Cob', 'Produce', 15, 'each',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Avocados',        'Produce', 15, 'each',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Cabbage',         'Produce',  8, 'head',  array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Kale',            'Produce',  8, 'bunch', array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Green Onions',    'Produce', 10, 'bunch', array['vegan','vegetarian','gluten-free','dairy-free'], null),

-- More Grains (in stock)
('Elbow Macaroni', 'Grains', 18, 'box',       array['vegan','vegetarian','dairy-free'], null),
('Ramen Noodles',  'Grains', 30, 'pack',      array['vegan','vegetarian','dairy-free'], null),
('Quinoa',         'Grains', 12, 'bag',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Couscous',       'Grains', 10, 'box',       array['vegan','vegetarian','dairy-free'], null),
('Breadcrumbs',    'Grains',  8, 'container', array['vegetarian','dairy-free'], null),

-- More Dairy (in stock)
('Butter',            'Dairy & Alternatives', 15, 'stick',  array['vegetarian','gluten-free'], null),
('Parmesan Cheese',   'Dairy & Alternatives', 10, 'block',  array['vegetarian','gluten-free'], null),
('Mozzarella Cheese', 'Dairy & Alternatives', 12, 'bag',    array['vegetarian','gluten-free'], null),
('Sour Cream',        'Dairy & Alternatives', 10, 'tub',    array['vegetarian','gluten-free'], null),
('Heavy Cream',       'Dairy & Alternatives',  8, 'pint',   array['vegetarian','gluten-free'], null),
('Cream Cheese',      'Dairy & Alternatives', 10, 'block',  array['vegetarian','gluten-free'], null),
('Whole Milk',        'Dairy & Alternatives', 15, 'gallon', array['vegetarian','gluten-free'], null),

-- Pantry Staples & Spices (in stock)
('All-Purpose Flour',     'Pantry', 12, 'bag',       array['vegan','vegetarian','dairy-free'], null),
('Granulated Sugar',      'Pantry', 10, 'bag',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Brown Sugar',           'Pantry',  8, 'bag',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Salt',                  'Pantry', 15, 'container', array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Black Pepper',          'Pantry', 12, 'container', array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Cumin',                 'Pantry',  8, 'jar',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Paprika',               'Pantry',  8, 'jar',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Chili Powder',          'Pantry',  8, 'jar',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Dried Oregano',         'Pantry',  8, 'jar',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Dried Basil',           'Pantry',  8, 'jar',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Cinnamon',              'Pantry',  8, 'jar',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Garlic Powder',         'Pantry',  8, 'jar',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Onion Powder',          'Pantry',  8, 'jar',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Red Pepper Flakes',     'Pantry',  6, 'jar',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Baking Powder',         'Pantry',  8, 'can',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Baking Soda',           'Pantry',  8, 'box',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Vanilla Extract',       'Pantry',  6, 'bottle',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Apple Cider Vinegar',   'Pantry',  8, 'bottle',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('White Vinegar',         'Pantry',  8, 'bottle',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Honey',                 'Pantry',  8, 'bottle',    array['vegetarian','gluten-free','dairy-free'], null),
('Maple Syrup',           'Pantry',  6, 'bottle',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Ketchup',               'Pantry', 10, 'bottle',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Yellow Mustard',        'Pantry',  8, 'bottle',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Mayonnaise',            'Pantry',  8, 'jar',       array['vegetarian','gluten-free','dairy-free'], null),
('Hot Sauce',             'Pantry', 10, 'bottle',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Coconut Milk',          'Pantry', 15, 'can',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Sesame Oil',            'Pantry',  6, 'bottle',    array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Cornstarch',            'Pantry',  8, 'box',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Worcestershire Sauce',  'Pantry',  6, 'bottle',    array['gluten-free','dairy-free'], null),
('Salsa',                 'Pantry', 12, 'jar',       array['vegan','vegetarian','gluten-free','dairy-free'], null),
('Canned Tomato Paste',   'Pantry', 15, 'can',       array['vegan','vegetarian','gluten-free','dairy-free'], null),

-- Arriving soon (future date_available — tests the "coming soon" recipe feature)
('Fresh Strawberries',  'Produce',  24, 'pint',  array['vegan','vegetarian','gluten-free','dairy-free'], '2026-02-28'),
('Canned Corn',         'Pantry',   36, 'can',   array['vegan','vegetarian','gluten-free','dairy-free'], '2026-02-26'),
('Whole Grain Cereal',  'Grains',   20, 'box',   array['vegan','vegetarian','dairy-free'],               '2026-03-03'),
('Broccoli',            'Produce',  16, 'head',  array['vegan','vegetarian','gluten-free','dairy-free'], '2026-02-24'),
('Steak',               'Proteins', 15, 'lbs',   array['gluten-free','dairy-free'],                     '2026-02-25'),
('Salmon Fillet',       'Proteins', 12, 'lbs',   array['gluten-free','dairy-free'],                     '2026-02-26'),
('Asparagus',           'Produce',  10, 'bunch', array['vegan','vegetarian','gluten-free','dairy-free'], '2026-02-27');

-- ─── Recipe Interactions ──────────────────────────────────────────────────────
-- Real Spoonacular IDs so the Popular Recipes tab renders images correctly

insert into recipe_interactions (recipe_id, recipe_title, recipe_image_url, interaction_type) values

-- Pasta with Garlic & Cauliflower (most popular)
(716429, 'Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs', 'https://img.spoonacular.com/recipes/716429-312x231.jpg', 'view'),
(716429, 'Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs', 'https://img.spoonacular.com/recipes/716429-312x231.jpg', 'view'),
(716429, 'Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs', 'https://img.spoonacular.com/recipes/716429-312x231.jpg', 'view'),
(716429, 'Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs', 'https://img.spoonacular.com/recipes/716429-312x231.jpg', 'like'),
(716429, 'Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs', 'https://img.spoonacular.com/recipes/716429-312x231.jpg', 'like'),

-- Cannellini Bean & Asparagus Salad
(782585, 'Cannellini Bean and Asparagus Salad with Mushrooms', 'https://img.spoonacular.com/recipes/782585-312x231.jpg', 'view'),
(782585, 'Cannellini Bean and Asparagus Salad with Mushrooms', 'https://img.spoonacular.com/recipes/782585-312x231.jpg', 'view'),
(782585, 'Cannellini Bean and Asparagus Salad with Mushrooms', 'https://img.spoonacular.com/recipes/782585-312x231.jpg', 'like'),

-- Farfalle with Peas
(642583, 'Farfalle with Peas, Ham and Cream Sauce', 'https://img.spoonacular.com/recipes/642583-312x231.jpg', 'view'),
(642583, 'Farfalle with Peas, Ham and Cream Sauce', 'https://img.spoonacular.com/recipes/642583-312x231.jpg', 'view'),
(642583, 'Farfalle with Peas, Ham and Cream Sauce', 'https://img.spoonacular.com/recipes/642583-312x231.jpg', 'view'),
(642583, 'Farfalle with Peas, Ham and Cream Sauce', 'https://img.spoonacular.com/recipes/642583-312x231.jpg', 'like'),

-- Pasta Margherita
(511728, 'Pasta Margherita',  'https://img.spoonacular.com/recipes/511728-312x231.jpg', 'view'),
(511728, 'Pasta Margherita',  'https://img.spoonacular.com/recipes/511728-312x231.jpg', 'like'),

-- Greek Pasta Salad
(716408, 'Greek Pasta Salad', 'https://img.spoonacular.com/recipes/716408-312x231.jpg', 'view'),
(716408, 'Greek Pasta Salad', 'https://img.spoonacular.com/recipes/716408-312x231.jpg', 'view');

-- ─── Quick verification ───────────────────────────────────────────────────────
select 'inventory' as tbl, count(*) from inventory
union all
select 'recipe_interactions', count(*) from recipe_interactions;

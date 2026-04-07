-- Optional seed data for local development
-- Run after migrations

INSERT INTO sessions (id, status, restaurant) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ready', 'Test Restaurant');

INSERT INTO menu_items (session_id, category, name, description, price, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Starters', 'Spring Rolls', 'Crispy fried vegetable rolls', 8.50, 0),
  ('00000000-0000-0000-0000-000000000001', 'Starters', 'Soup of the Day', 'Ask your waiter', NULL, 1),
  ('00000000-0000-0000-0000-000000000001', 'Mains', 'Grilled Salmon', 'With seasonal vegetables', 24.00, 2),
  ('00000000-0000-0000-0000-000000000001', 'Mains', 'Pasta Carbonara', 'Spaghetti, egg, pecorino, guanciale', 16.50, 3),
  ('00000000-0000-0000-0000-000000000001', 'Desserts', 'Chocolate Lava Cake', 'Warm chocolate cake with vanilla ice cream', 9.00, 4);

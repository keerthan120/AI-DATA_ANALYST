import csv
import random
from datetime import datetime, timedelta

random.seed(42)

# 1. Products
products = [
    ("P101", "Ultra Pro Laptop", "Electronics", 750.00, 1199.99, 120),
    ("P102", "Wireless Ergonomic Mouse", "Accessories", 15.00, 39.99, 450),
    ("P103", "Noise Cancelling Headphones", "Audio", 80.00, 179.99, 210),
    ("P104", "Mechanical Gaming Keyboard", "Accessories", 45.00, 99.99, 180),
    ("P105", "4K Ultra-Wide Monitor", "Electronics", 220.00, 399.99, 90),
    ("P106", "Smart Fitness Tracker", "Wearables", 35.00, 69.99, 310),
    ("P107", "USB-C Multiport Hub", "Accessories", 12.00, 29.99, 500),
    ("P108", "Portable SSD 1TB", "Storage", 55.00, 109.99, 140),
    ("P109", "Vintage Desk Fan", "Office", 18.00, 24.99, 15),  # Underperforming product
    ("P110", "Laser Pointer Stylus", "Office", 5.00, 8.99, 25),   # Underperforming product
]

with open("sample_data/products.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["product_id", "product_name", "category", "cost_price", "list_price", "stock_quantity"])
    writer.writerows(products)

# 2. Customers
customers = [
    ("C001", "Acme Enterprise", "acme@enterprise.com", "Corporate", "USA", "2023-01-15"),
    ("C002", "Nova Corp", "nova@novacorp.io", "Corporate", "Canada", "2023-03-22"),
    ("C003", "Global Logistics Ltd", "contact@globallog.com", "Enterprise", "UK", "2023-02-10"),
    ("C004", "Apex Financial", "billing@apexfin.com", "Enterprise", "USA", "2023-05-18"),
    ("C005", "Summit Health Systems", "procurement@summithealth.org", "Healthcare", "USA", "2023-04-09"),
    ("C006", "Horizon Retail Partners", "orders@horizonretail.com", "Retail", "Germany", "2023-06-30"),
    ("C007", "Starlight Media", "info@starlightmedia.co", "SMB", "USA", "2023-07-12"),
    ("C008", "Pinnacle Tech Solutions", "tech@pinnacletech.net", "Corporate", "Australia", "2023-08-25"),
    ("C009", "Urban Outfitters Supply", "supply@urbanoutfit.org", "Retail", "UK", "2023-09-05"),
    ("C010", "BlueSky Cloud Services", "admin@blueskycloud.com", "SMB", "USA", "2023-11-14"),
]

with open("sample_data/customers.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["customer_id", "customer_name", "email", "segment", "country", "signup_date"])
    writer.writerows(customers)

# 3. Sales Transactions (spanning 2024 Jan - Dec with trends, regional data, and explicit outliers)
regions = ["North", "South", "East", "West", "Central"]
region_weights = [0.25, 0.15, 0.35, 0.15, 0.10] # East has highest revenue
payment_methods = ["Credit Card", "Wire Transfer", "ACH", "Corporate Card"]

start_date = datetime(2024, 1, 1)
transactions = []

# Generate 300 realistic transactions
for t_id in range(1001, 1301):
    c = random.choice(customers)
    # Acme Enterprise and Nova Corp are high-value buyers
    if c[0] in ["C001", "C002", "C003"]:
        p = random.choice(products[:5]) # High value products
        qty = random.randint(3, 15)
    elif c[0] in ["C004", "C005"]:
        p = random.choice(products[:6])
        qty = random.randint(2, 10)
    else:
        p = random.choice(products)
        qty = random.randint(1, 4)
        
    days_offset = random.randint(0, 360)
    order_date = start_date + timedelta(days=days_offset)
    
    # Slight seasonal boost in Q4 (Nov, Dec)
    if order_date.month in [11, 12]:
        qty = int(qty * 1.5)
        
    unit_price = p[4]
    total_amount = round(qty * unit_price, 2)
    reg = random.choices(regions, weights=region_weights)[0]
    pay = random.choice(payment_methods)
    
    transactions.append([f"TX{t_id}", c[0], p[0], order_date.strftime("%Y-%m-%d"), qty, unit_price, total_amount, reg, pay])

# Inject deliberate statistical anomalies for anomaly detection
# Anomaly 1: Huge bulk order outlier (Z-score > 4)
transactions.append(["TX9991", "C001", "P101", "2024-06-15", 85, 1199.99, 101999.15, "East", "Wire Transfer"])
# Anomaly 2: Extreme quantity anomaly
transactions.append(["TX9992", "C004", "P107", "2024-09-20", 650, 29.99, 19493.50, "West", "ACH"])
# Anomaly 3: Suspicious zero total transaction
transactions.append(["TX9993", "C007", "P102", "2024-11-05", 1, 39.99, 0.00, "North", "Credit Card"])

with open("sample_data/sales_transactions.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["transaction_id", "customer_id", "product_id", "order_date", "quantity", "unit_price", "total_amount", "region", "payment_method"])
    writer.writerows(transactions)

print("Generated sample datasets successfully!")

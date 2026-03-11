from collections import defaultdict
import datetime
from typing import List
import random

def generate_insights(transactions, categories):
    if not transactions:
        return ["Você ainda não tem transações suficientes para análise."]
    
    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expense = sum(t.amount for t in transactions if t.type == "expense")
    
    insights = []
    
    # Savings Rate
    if total_income > 0:
        savings = total_income - total_expense
        savings_rate = (savings / total_income) * 100
        
        if savings_rate >= 20:
            insights.append(f"Ótimo trabalho! Você economiza cerca de {savings_rate:.1f}% da sua renda. Este é um índice de poupança muito forte!")
        elif savings_rate > 0:
            insights.append(f"Sua taxa de economia é de {savings_rate:.1f}%. Tente reduzir gastos variáveis para chegar na faixa ideal de 20%.")
        else:
            insights.append("Atenção! Suas despesas estão superando sua renda. É recomendado revisar seus maiores gastos imediatamente.")
            
    # Categories analysis
    cat_map = {c.id: c.name for c in categories}
    expense_by_cat = defaultdict(float)
    for t in transactions:
        if t.type == "expense":
            cat_name = cat_map.get(t.category_id, "Outros")
            expense_by_cat[cat_name] += t.amount
            
    if expense_by_cat:
        top_category = max(expense_by_cat, key=expense_by_cat.get)
        top_amount = expense_by_cat[top_category]
        if total_expense > 0 and (top_amount / total_expense) > 0.4:
            insights.append(f"Seus gastos com '{top_category}' representam uma grande parte das suas despesas totais. Considere estabelecer um orçamento semanal para esta categoria.")
    
    return insights

def generate_business_ideas(transactions):
    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expense = sum(t.amount for t in transactions if t.type == "expense")
    savings = total_income - total_expense
    
    ideas = []
    if savings > 1000:
        ideas.append("Com suas economias atuais, alocar parte em um projeto paralelo ou abrir um e-commerce local de baixo risco poderia acelerar seu crescimento financeiro.")
        ideas.append("Considere investir parte desses recursos em conhecimento (cursos, consultorias) para alavancar um negócio voltado à sua principal área de atuação.")
    elif savings > 0:
        ideas.append("Como você tem alguma margem positiva mensalmente, prestar serviços como freelancer nas horas vagas requer pouco capital e ajuda a engordar a poupança para projetos maiores.")
        ideas.append("Começar um negócio de 'dropshipping' ou revenda de produtos sob demanda na internet pode ser um ótimo primeiro passo dado seu risco financeiro baixo.")
    else:
        ideas.append("No momento, o foco principal deve ser o controle de despesas ou a geração de renda extra imediata, como iniciar a venda de um hobby de baixo custo (artesanato, bolos, marmitas) na vizinhança.")
        
    return ideas

def forecast_balance(transactions, months: int):
    # Very basic linear forecast
    if not transactions:
        return {"current_balance": 0.0, "projected_balance": 0.0, "trend_monthly": 0.0}
        
    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expense = sum(t.amount for t in transactions if t.type == "expense")
    current_balance = total_income - total_expense
    
    # Estimate average monthly savings
    # Assume the history spans over exactly N months
    dates = [t.date for t in transactions]
    if dates:
        start_date = min(dates)
        end_date = datetime.datetime.utcnow()
        days_diff = (end_date - start_date).days
        months_diff = max(1, days_diff / 30.0)
    else:
        months_diff = 1.0
        
    monthly_trend = current_balance / months_diff
    projected = current_balance + (monthly_trend * months)
    
    return {
        "current_balance": round(current_balance, 2),
        "projected_balance": round(projected, 2),
        "trend_monthly": round(monthly_trend, 2)
    }

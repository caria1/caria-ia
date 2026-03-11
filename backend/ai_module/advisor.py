from collections import defaultdict
import datetime
from typing import List
import random

def generate_insights(transactions, categories):
    if not transactions:
        return ["Você ainda não tem transações suficientes para uma análise profunda. Registre suas despesas diárias para começar!"]
    
    # 1. Basic Stats
    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expense = sum(t.amount for t in transactions if t.type == "expense")
    net_savings = total_income - total_expense
    
    insights = []
    
    # 2. Savings Rate Analysis
    if total_income > 0:
        savings_rate = (net_savings / total_income) * 100
        
        if savings_rate >= 30:
            insights.append("🌟 **Nível Elite:** Sua taxa de poupança está acima de 30%. Você está no caminho rápido para a liberdade financeira!")
        elif savings_rate >= 15:
            insights.append(f"✅ **Bom progresso:** Você economizou {savings_rate:.1f}% da sua renda. Tente chegar aos 20% para otimizar seus investimentos.")
        elif savings_rate > 0:
            insights.append(f"⚠️ **Margem Apertada:** Sua taxa de economia é de apenas {savings_rate:.1f}%. Qualquer imprevisto pode comprometer seu orçamento.")
        else:
            insights.append("🚨 **Alerta de Déficit:** Suas despesas superaram sua renda. É crucial cortar gastos não essenciais imediatamente.")

    # 3. Emergency Fund Insight (assuming basic balance check)
    avg_monthly_expense = total_expense / max(1, (len(set(t.date.strftime("%Y-%m") for t in transactions)) or 1))
    # We'd need current balance, but we can infer from net_savings for now
    if net_savings > 0 and net_savings < (avg_monthly_expense * 3):
        insights.append(f"🛡️ **Reserva de Emergência:** Você ainda não possui 3 meses de despesas guardados (estimado em {avg_monthly_expense*3:.0f},00). Priorize este fundo.")
    elif net_savings >= (avg_monthly_expense * 6):
        insights.append("💎 **Segurança Plena:** Você parece ter uma reserva robusta. Já pensou em diversificar para ativos de maior rentabilidade?")

    # 4. Categories Analysis
    cat_map = {c.id: c.name for c in categories}
    expense_by_cat = defaultdict(float)
    for t in transactions:
        if t.type == "expense":
            cat_name = cat_map.get(t.category_id, "Outros")
            expense_by_cat[cat_name] += t.amount
            
    if expense_by_cat:
        # Transformando para dict comum para ajudar o type checker
        cat_data = dict(expense_by_cat)
        top_category = max(cat_data, key=cat_data.get)
        top_amount = cat_data[top_category]
        if total_expense > 0:
            ratio = (top_amount / total_expense) * 100
            if ratio > 50:
                 insights.append(f"📊 **Concentração de Gastos:** Mais de metade do seu dinheiro ({ratio:.0f}%) vai para '{top_category}'. Há espaço para otimização aqui?")
            elif ratio > 30:
                 insights.append(f"🔍 **Ponto de Atenção:** '{top_category}' consome {ratio:.0f}% das suas despesas. Verifique se todos esses gastos são essenciais.")

    # 5. Fixed vs Variable (Heuristic)
    # Categorias como Aluguel, Internet, etc costumam ser "Moradia", "Comunicação"
    # Aqui poderíamos expandir se tivéssemos flags no schema
    
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

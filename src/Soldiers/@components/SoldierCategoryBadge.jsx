export default function SoldierCategoryBadge({ category }) {
    if (!category) return null;

    return (
        <span
            className="cat-badge"
            style={{
                background: category.bg,
                color: category.color,
                border: `1px solid ${category.color}`,
            }}
        >
            {category.label}
        </span>
    );
}

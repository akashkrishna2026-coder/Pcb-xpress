// FinalAssemblySidebar.jsx
import { Button } from '@/components/ui/button';

const FinalAssemblySidebar = ({ items = [], activeSection, onNavigate }) => (
  <aside className="w-64 bg-gradient-to-b from-blue-50 to-blue-100 border-r border-blue-200 shadow-lg">
    <nav className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-blue-800">Final Assembly Navigation</h2>
      </div>
      
      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <li key={item.id}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                    : 'text-blue-700 hover:bg-blue-50 hover:text-blue-900'
                }`}
                onClick={() => onNavigate && onNavigate(item.id)}
              >
                {Icon ? <Icon className="h-4 w-4 mr-3" /> : null}
                {item.label}
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  </aside>
);

export default FinalAssemblySidebar;